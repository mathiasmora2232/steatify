import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WrappedService } from '../wrapped/wrapped.service';
import { DnaService } from '../dna/dna.service';
import { ChartsService } from '../charts/charts.service';

/**
 * Public, shareable profile at /profiles/:username (no auth). Honours the
 * isPublic flag. Combines the Wrapped recap + DNA archetypes into one identity.
 */
@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wrapped: WrappedService,
    private readonly dna: DnaService,
    private readonly charts: ChartsService,
  ) {}

  @Get(':username')
  async profile(@Param('username') username: string) {
    const u = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        location: true,
        website: true,
        isPublic: true,
        showMusic: true,
        showSteam: true,
        showcase: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException('Perfil no encontrado.');

    const base = {
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bannerUrl: u.bannerUrl,
      bio: u.bio,
      location: u.location,
      website: u.website,
      isPublic: u.isPublic,
      showcase: u.showcase,
      createdAt: u.createdAt,
    };
    if (!u.isPublic) return { ...base, private: true };

    const [wrapped, dna, charts, extras, mood] = await Promise.all([
      this.wrapped.generate(u.id, 'month', { narrative: false }), // public profile doesn't show it — skip the GPT call
      this.dna.compute(u.id),
      this.charts.records(u.id),
      this.profileExtras(u.id),
      this.currentMood(u.id),
    ]);
    // Respect the user's privacy toggles — hide music or gaming if turned off.
    return {
      ...base,
      personalityName: wrapped.personalityName,
      personality: wrapped.personality, // archetype { key,label,emoji,tagline } → passport class
      mix: wrapped.mix, // the blend for the passport bars
      mood: u.showMusic || u.showSteam ? mood : null,
      music: u.showMusic ? wrapped.music : null,
      gaming: u.showSteam ? wrapped.gaming : null,
      dna: u.showMusic ? { archetypes: dna.archetypes, personality: dna.personality } : null,
      hallOfFame: u.showMusic ? charts.hallOfFame.slice(0, 4) : [],
      records: u.showMusic ? charts.records : [],
      collections: extras.collections,
      timeline: u.showMusic ? extras.timeline : [],
      exploration: u.showSteam ? extras.exploration : null,
    };
  }

  /**
   * The user's CURRENT vibe, from the last ~2 weeks of activity. Makes the
   * profile feel alive ("Modo Nostalgia" because they revived old songs).
   */
  private async currentMood(userId: string) {
    const [recent, repeat, revived, fresh, gaming] = await Promise.all([
      this.prisma.$queryRaw<Array<{ plays: number }>>`SELECT COUNT(*)::int AS plays FROM listening_history WHERE "userId" = ${userId} AND "playedAt" > now() - interval '14 days'`,
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COALESCE(MAX(c),0)::int AS c FROM (SELECT COUNT(*) AS c FROM listening_history WHERE "userId" = ${userId} AND "playedAt" > now() - interval '14 days' GROUP BY "trackId") x`,
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(DISTINCT lh."trackId")::int AS c FROM listening_history lh JOIN (SELECT "trackId", MIN("playedAt") AS fp FROM listening_history WHERE "userId" = ${userId} GROUP BY "trackId") f ON f."trackId" = lh."trackId" WHERE lh."userId" = ${userId} AND lh."playedAt" > now() - interval '14 days' AND f.fp < now() - interval '365 days'`,
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(DISTINCT lh."artistId")::int AS c FROM listening_history lh JOIN (SELECT "artistId", MIN("playedAt") AS fp FROM listening_history WHERE "userId" = ${userId} GROUP BY "artistId") f ON f."artistId" = lh."artistId" WHERE lh."userId" = ${userId} AND lh."playedAt" > now() - interval '14 days' AND f.fp > now() - interval '14 days'`,
      this.prisma.$queryRaw<Array<{ h: number }>>`SELECT COALESCE(SUM("playtime2Weeks"),0)::float / 60 AS h FROM user_games WHERE "userId" = ${userId}`,
    ]);
    const plays = recent[0]?.plays ?? 0;
    const topRepeat = repeat[0]?.c ?? 0;
    const revivedOld = revived[0]?.c ?? 0;
    const newArtists = fresh[0]?.c ?? 0;
    const gamerHours = Math.round(gaming[0]?.h ?? 0);

    if (plays === 0 && gamerHours === 0) return null;
    if (topRepeat >= 18) return { key: 'obsesion', label: 'Modo Obsesión', emoji: '🔥', detail: `Una canción en repeat ${topRepeat} veces estas 2 semanas` };
    if (revivedOld >= 10) return { key: 'nostalgia', label: 'Modo Nostalgia', emoji: '🌙', detail: `Reviviste ${revivedOld} canciones de tu pasado` };
    if (newArtists >= 12) return { key: 'explorador', label: 'Modo Explorador', emoji: '🧭', detail: `Descubriste ${newArtists} artistas nuevos` };
    if (gamerHours >= 10 && plays < 60) return { key: 'gamer', label: 'Modo Gamer', emoji: '🎮', detail: `${gamerHours}h de juego estas 2 semanas` };
    return { key: 'inmersion', label: 'Modo Inmersión', emoji: '🎧', detail: `${plays} reproducciones estas 2 semanas` };
  }

  /** Collections counts, a life timeline (eras) and gaming exploration %. */
  private async profileExtras(userId: string) {
    const [obs, leyendas, cementerio, expl, eras] = await Promise.all([
      this.prisma.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*)::int AS c FROM (
          SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
          GROUP BY "trackId" HAVING COUNT(*) >= 20
        ) x`,
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*)::int AS c FROM user_achievements WHERE "userId" = ${userId}`,
      // Cementerio = canciones que AMASTE (10+ plays) pero llevas 120+ días sin tocar.
      this.prisma.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*)::int AS c FROM (
          SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
          GROUP BY "trackId" HAVING COUNT(*) >= 10 AND MAX("playedAt") < now() - interval '120 days'
        ) x`,
      this.prisma.$queryRaw<Array<{ played: number; total: number }>>`
        SELECT COUNT(*) FILTER (WHERE "playtimeForever" > 0)::float AS played, COUNT(*)::float AS total
        FROM user_games WHERE "userId" = ${userId}`,
      this.prisma.musicEra.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 8,
        select: { startDate: true, title: true, eraType: true },
      }),
    ]);
    const games = await this.prisma.userGame.count({ where: { userId, playtimeForever: { gt: 0 } } });
    const e = expl[0];
    return {
      collections: {
        obsesiones: obs[0]?.c ?? 0,
        mundos: games,
        leyendas: leyendas[0]?.c ?? 0,
        cementerio: cementerio[0]?.c ?? 0,
      },
      exploration: e && e.total > 0 ? Math.round((e.played / e.total) * 100) : null,
      timeline: eras.map((er) => ({
        date: er.startDate.toISOString(),
        title: er.title,
        type: er.eraType,
      })),
    };
  }
}
