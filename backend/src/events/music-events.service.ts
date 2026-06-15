import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Row = Prisma.MusicEventCreateManyInput;

const RECORD_MILESTONES = [50, 100, 200, 300, 500, 750, 1000];

/**
 * The "changelog of your musical life". Detects notable events from
 * listening_history and persists them (deduped by `dedupeKey`) so they can feed
 * the home feed, Wrapped and notifications. Detection is idempotent: running it
 * every sync only ever adds genuinely-new events.
 */
@Injectable()
export class MusicEventsService {
  private readonly logger = new Logger(MusicEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limit = 30) {
    return this.prisma.musicEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async generate(userId: string): Promise<{ created: number }> {
    const [firsts, comebacks, records, anniversaries, obsessions, newArtists, artistComebacks, gameObsessions] =
      await Promise.all([
        this.firstTimes(userId),
        this.comebacks(userId),
        this.records(userId),
        this.anniversaries(userId),
        this.obsessions(userId),
        this.newArtists(userId),
        this.artistComebacks(userId),
        this.gameObsessions(userId),
      ]);

    const ids = new Set<string>();
    [firsts, comebacks, records, anniversaries, obsessions].flat().forEach((r) => ids.add(r.trackId));
    const meta = await this.trackMeta([...ids]);

    const artistIds = new Set<string>();
    [newArtists, artistComebacks].flat().forEach((r) => artistIds.add(r.artistId));
    const aMeta = await this.artistMeta([...artistIds]);

    const events: Row[] = [];
    const week = isoWeek(new Date());

    for (const r of firsts) {
      const m = meta(r.trackId);
      events.push({
        userId,
        type: 'FIRST_TIME',
        entityId: r.trackId,
        title: 'Nueva en tu vida',
        body: `Descubriste ${m.name}${m.artist ? ` de ${m.artist}` : ''}.`,
        imageUrl: m.imageUrl,
        dedupeKey: `FIRST_TIME:track:${r.trackId}`,
        metadata: { plays: r.plays },
        createdAt: r.first,
      });
    }
    for (const r of comebacks) {
      const m = meta(r.trackId);
      events.push({
        userId,
        type: 'COMEBACK',
        entityId: r.trackId,
        title: 'Regreso',
        body: `${m.name} volvió después de ${r.daysGone} días.`,
        imageUrl: m.imageUrl,
        dedupeKey: `COMEBACK:track:${r.trackId}:${r.lastBefore.toISOString().slice(0, 10)}`,
        metadata: { daysGone: r.daysGone },
        createdAt: r.firstRecent,
      });
    }
    for (const r of records) {
      const crossed = RECORD_MILESTONES.filter((m) => r.before < m && m <= r.total);
      const m = meta(r.trackId);
      for (const milestone of crossed) {
        events.push({
          userId,
          type: 'NEW_RECORD',
          entityId: r.trackId,
          title: 'Nuevo récord',
          body: `${m.name} llegó a ${milestone} reproducciones.`,
          imageUrl: m.imageUrl,
          dedupeKey: `NEW_RECORD:track:${r.trackId}:${milestone}`,
          metadata: { milestone, total: r.total },
        });
      }
    }
    for (const r of anniversaries) {
      const years = Math.round(r.daysSince / 365);
      if (years < 1) continue;
      const m = meta(r.trackId);
      events.push({
        userId,
        type: 'ANNIVERSARY',
        entityId: r.trackId,
        title: 'Aniversario',
        body: `Hace ${years} año${years > 1 ? 's' : ''} descubriste ${m.name}.`,
        imageUrl: m.imageUrl,
        dedupeKey: `ANNIVERSARY:track:${r.trackId}:${years}`,
        metadata: { years, plays: r.plays },
      });
    }
    for (const r of obsessions) {
      if (r.recent < 8 || r.prior > r.recent / 2) continue;
      const m = meta(r.trackId);
      events.push({
        userId,
        type: 'NEW_OBSESSION',
        entityId: r.trackId,
        title: 'Nueva obsesión',
        body: `${m.name} es tu nueva obsesión: ${r.recent} veces esta semana.`,
        imageUrl: m.imageUrl,
        dedupeKey: `NEW_OBSESSION:track:${r.trackId}:${week}`,
        metadata: { recent: r.recent },
      });
    }

    for (const r of newArtists) {
      const m = aMeta(r.artistId);
      events.push({
        userId,
        type: 'NEW_ARTIST',
        entityType: 'artist',
        entityId: r.artistId,
        title: 'Artista nuevo',
        body: `${m.name} entró a tu rotación por primera vez.`,
        imageUrl: m.imageUrl,
        dedupeKey: `NEW_ARTIST:artist:${r.artistId}`,
        metadata: { plays: r.plays },
        createdAt: r.first,
      });
    }
    for (const r of artistComebacks) {
      const m = aMeta(r.artistId);
      events.push({
        userId,
        type: 'ARTIST_COMEBACK',
        entityType: 'artist',
        entityId: r.artistId,
        title: 'Regreso de artista',
        body: `${m.name} volvió a tu rotación después de ${r.daysGone} días.`,
        imageUrl: m.imageUrl,
        dedupeKey: `ARTIST_COMEBACK:artist:${r.artistId}:${r.lastBefore.toISOString().slice(0, 10)}`,
        metadata: { daysGone: r.daysGone },
        createdAt: r.firstRecent,
      });
    }
    for (const g of gameObsessions) {
      const hours = Math.round(g.playtime2Weeks / 60);
      events.push({
        userId,
        type: 'GAME_OBSESSION',
        entityType: 'game',
        entityId: g.gameId,
        title: 'Obsesión gamer',
        body: `Le metiste ${hours}h a ${g.game.name} estas 2 semanas.`,
        imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.game.appId}/header.jpg`,
        dedupeKey: `GAME_OBSESSION:game:${g.gameId}:${week}`,
        metadata: { minutes: g.playtime2Weeks },
      });
    }

    if (events.length === 0) return { created: 0 };
    const { count } = await this.prisma.musicEvent.createMany({ data: events, skipDuplicates: true });
    this.logger.debug(`Events for ${userId}: ${count} new (of ${events.length} candidates)`);
    return { created: count };
  }

  // ── detectors ──

  private firstTimes(userId: string) {
    return this.prisma.$queryRaw<Array<{ trackId: string; first: Date; plays: number }>>`
      SELECT "trackId", MIN("playedAt") AS first, COUNT(*)::int AS plays
      FROM listening_history WHERE "userId" = ${userId}
      GROUP BY "trackId"
      HAVING MIN("playedAt") >= now() - interval '14 days' AND COUNT(*) >= 2
      ORDER BY plays DESC LIMIT 25
    `;
  }

  private comebacks(userId: string) {
    return this.prisma.$queryRaw<Array<{ trackId: string; daysGone: number; lastBefore: Date; firstRecent: Date }>>`
      WITH recent AS (
        SELECT "trackId", MIN("playedAt") AS first_recent
        FROM listening_history WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '14 days'
        GROUP BY "trackId"
      ),
      prior_last AS (
        SELECT "trackId", MAX("playedAt") AS last_before
        FROM listening_history WHERE "userId" = ${userId} AND "playedAt" < now() - interval '14 days'
        GROUP BY "trackId" HAVING COUNT(*) >= 4
      )
      SELECT r."trackId",
             (EXTRACT(EPOCH FROM (r.first_recent - pl.last_before)) / 86400)::int AS "daysGone",
             pl.last_before AS "lastBefore",
             r.first_recent AS "firstRecent"
      FROM recent r JOIN prior_last pl ON pl."trackId" = r."trackId"
      WHERE (r.first_recent - pl.last_before) >= interval '45 days'
      ORDER BY "daysGone" DESC LIMIT 15
    `;
  }

  private records(userId: string) {
    return this.prisma.$queryRaw<Array<{ trackId: string; total: number; before: number }>>`
      SELECT "trackId",
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE "playedAt" < now() - interval '14 days')::int AS before
      FROM listening_history WHERE "userId" = ${userId}
      GROUP BY "trackId"
      HAVING COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '14 days') > 0 AND COUNT(*) >= 50
    `;
  }

  private anniversaries(userId: string) {
    return this.prisma.$queryRaw<Array<{ trackId: string; daysSince: number; plays: number }>>`
      SELECT "trackId",
             (EXTRACT(EPOCH FROM (now() - MIN("playedAt"))) / 86400)::int AS "daysSince",
             COUNT(*)::int AS plays
      FROM listening_history WHERE "userId" = ${userId}
      GROUP BY "trackId"
      HAVING COUNT(*) >= 5 AND (
        (now() - MIN("playedAt")) BETWEEN interval '362 days' AND interval '368 days' OR
        (now() - MIN("playedAt")) BETWEEN interval '727 days' AND interval '733 days' OR
        (now() - MIN("playedAt")) BETWEEN interval '1092 days' AND interval '1098 days' OR
        (now() - MIN("playedAt")) BETWEEN interval '1457 days' AND interval '1463 days'
      )
    `;
  }

  private obsessions(userId: string) {
    return this.prisma.$queryRaw<Array<{ trackId: string; recent: number; prior: number }>>`
      SELECT "trackId",
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '7 days')::int AS recent,
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days')::int AS prior
      FROM listening_history WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '14 days'
      GROUP BY "trackId"
      HAVING COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '7 days') >= 8
    `;
  }

  private newArtists(userId: string) {
    return this.prisma.$queryRaw<Array<{ artistId: string; first: Date; plays: number }>>`
      SELECT "artistId", MIN("playedAt") AS first, COUNT(*)::int AS plays
      FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
      GROUP BY "artistId"
      HAVING MIN("playedAt") >= now() - interval '14 days' AND COUNT(*) >= 3
      ORDER BY plays DESC LIMIT 15
    `;
  }

  private artistComebacks(userId: string) {
    return this.prisma.$queryRaw<Array<{ artistId: string; daysGone: number; lastBefore: Date; firstRecent: Date }>>`
      WITH recent AS (
        SELECT "artistId", MIN("playedAt") AS first_recent
        FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" >= now() - interval '14 days'
        GROUP BY "artistId"
      ),
      prior_last AS (
        SELECT "artistId", MAX("playedAt") AS last_before
        FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" < now() - interval '14 days'
        GROUP BY "artistId" HAVING COUNT(*) >= 10
      )
      SELECT r."artistId",
             (EXTRACT(EPOCH FROM (r.first_recent - pl.last_before)) / 86400)::int AS "daysGone",
             pl.last_before AS "lastBefore",
             r.first_recent AS "firstRecent"
      FROM recent r JOIN prior_last pl ON pl."artistId" = r."artistId"
      WHERE (r.first_recent - pl.last_before) >= interval '60 days'
      ORDER BY "daysGone" DESC LIMIT 10
    `;
  }

  private gameObsessions(userId: string) {
    return this.prisma.userGame.findMany({
      where: { userId, playtime2Weeks: { gte: 600 } }, // ≥10h in the last 2 weeks
      orderBy: { playtime2Weeks: 'desc' },
      take: 8,
      select: {
        gameId: true,
        playtime2Weeks: true,
        game: { select: { name: true, appId: true } },
      },
    });
  }

  private async artistMeta(ids: string[]) {
    const artists = ids.length
      ? await this.prisma.artist.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, imageUrl: true } })
      : [];
    const byId = new Map(artists.map((a) => [a.id, a]));
    return (id: string) => {
      const a = byId.get(id);
      return { name: a?.name ?? 'Un artista', imageUrl: a?.imageUrl ?? null };
    };
  }

  private async trackMeta(ids: string[]) {
    const tracks = ids.length
      ? await this.prisma.track.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            name: true,
            album: { select: { imageUrl: true } },
            artists: { include: { artist: { select: { name: true } } }, orderBy: { position: 'asc' }, take: 1 },
          },
        })
      : [];
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return (id: string) => {
      const t = byId.get(id);
      return {
        name: t?.name ?? 'Una canción',
        artist: t?.artists[0]?.artist.name ?? null,
        imageUrl: t?.album?.imageUrl ?? null,
      };
    };
  }
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
