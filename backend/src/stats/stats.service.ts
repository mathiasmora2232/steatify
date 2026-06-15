import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { moodFrom, MOOD_LABEL } from '../common/mood.util';
import { Window } from './range';

export interface TopItem {
  id: string;
  name: string;
  subtitle?: string; // artist for tracks/albums
  imageUrl?: string | null;
  plays: number;
  minutes: number;
}

export interface Summary {
  label: string;
  minutes: number;
  plays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  mood: { key: string; label: string } | null;
  topTrack: TopItem | null;
  topArtist: TopItem | null;
}

export type TopType = 'tracks' | 'artists' | 'albums' | 'genres';

/**
 * Computes stats on-the-fly from listening_history with GROUP BY + the indexes
 * defined in the schema. Every read is scoped to a {start, end} Window (end
 * exclusive; null bounds = open), so the same code serves presets, a single
 * day, or an arbitrary date range. Counts/sums are cast to int/float in SQL so
 * nothing returns as BigInt; names/images are enriched via typed Prisma queries.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, win: Window): Promise<Summary> {
    const { start, end } = win;
    const [agg] = await this.prisma.$queryRaw<
      Array<{
        ms: number;
        plays: number;
        uniqueTracks: number;
        uniqueArtists: number;
        uniqueAlbums: number;
        valence: number | null;
        energy: number | null;
      }>
    >`
      SELECT
        COALESCE(SUM(lh."msPlayed"), 0)::float       AS ms,
        COUNT(*)::int                                AS plays,
        COUNT(DISTINCT lh."trackId")::int            AS "uniqueTracks",
        COUNT(DISTINCT lh."artistId")::int           AS "uniqueArtists",
        COUNT(DISTINCT t."albumId")::int             AS "uniqueAlbums",
        AVG(tf.valence)::float                       AS valence,
        AVG(tf.energy)::float                        AS energy
      FROM listening_history lh
      LEFT JOIN tracks t ON t.id = lh."trackId"
      LEFT JOIN track_features tf ON tf."trackId" = lh."trackId"
      WHERE lh."userId" = ${userId}
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
    `;

    const [topTracks, topArtists] = await Promise.all([
      this.topTracks(userId, win, 1),
      this.topArtists(userId, win, 1),
    ]);

    const hasMood = agg.valence != null && agg.energy != null;
    const moodKey = hasMood ? moodFrom(agg.valence, agg.energy) : null;

    return {
      label: win.label,
      minutes: Math.round(agg.ms / 60000),
      plays: agg.plays,
      uniqueTracks: agg.uniqueTracks,
      uniqueArtists: agg.uniqueArtists,
      uniqueAlbums: agg.uniqueAlbums,
      mood: moodKey ? { key: moodKey, label: MOOD_LABEL[moodKey] } : null,
      topTrack: topTracks[0] ?? null,
      topArtist: topArtists[0] ?? null,
    };
  }

  /**
   * "Estado de actividad" — what the last 24h SAY about you, from real signals
   * (volume vs your average, night ratio, repetition, discovery, gaming), never
   * invented emotions. Always returns a reason citing the number behind it.
   */
  async activityState(userId: string): Promise<{
    state: string;
    label: string;
    reason: string;
    signals: { plays24: number; avgPerDay: number; nightPct: number; topTrackPlays: number; newArtists: number; gamingHours: number };
  }> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;

    const [music] = await this.prisma.$queryRaw<
      Array<{ plays: number; night: number; artists: number; minutes: number; avgday: number | null }>
    >`
      WITH recent AS (
        SELECT * FROM listening_history WHERE "userId" = ${userId} AND "playedAt" >= NOW() - INTERVAL '24 hours'
      ), overall AS (
        SELECT COUNT(*)::float AS plays, COUNT(DISTINCT date_trunc('day', "playedAt"))::float AS days
        FROM listening_history WHERE "userId" = ${userId}
      )
      SELECT COUNT(*)::int AS plays,
        (COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                              OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6))::int AS night,
        COUNT(DISTINCT "artistId")::int AS artists,
        (COALESCE(SUM("msPlayed"),0)/60000.0)::float AS minutes,
        (SELECT CASE WHEN days > 0 THEN plays / days ELSE 0 END FROM overall) AS avgday
      FROM recent
    `;
    const [topTrack] = await this.prisma.$queryRaw<Array<{ name: string; c: number }>>`
      SELECT t.name, COUNT(*)::int AS c
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY t.name ORDER BY c DESC LIMIT 1
    `;
    const [fresh] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM (
        SELECT "artistId" FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY "artistId" HAVING MIN("playedAt") >= NOW() - INTERVAL '24 hours'
      ) x
    `;
    const [game] = await this.prisma.$queryRaw<Array<{ hours: number }>>`
      WITH base AS (
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins
        FROM steam_game_snapshots WHERE "userId" = ${userId} AND "capturedAt" <= NOW() - INTERVAL '12 hours'
        ORDER BY "appId", "capturedAt" DESC
      )
      SELECT COALESCE(SUM(GREATEST(0, ug."playtimeForever" - b.mins)), 0)::float / 60.0 AS hours
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId" JOIN base b ON b."appId" = g."appId"
      WHERE ug."userId" = ${userId}
    `;

    const plays = music?.plays ?? 0;
    const avgPerDay = Math.round(music?.avgday ?? 0);
    const nightPct = plays > 0 ? Math.round(((music?.night ?? 0) / plays) * 100) : 0;
    const topTrackPlays = topTrack?.c ?? 0;
    const newArtists = fresh?.c ?? 0;
    const gamingHours = Math.round((game?.hours ?? 0) * 10) / 10;
    const intensity = avgPerDay > 0 ? plays / avgPerDay : 0;

    const pick = this.pickActivityState({ plays, avgPerDay, intensity, nightPct, topTrackPlays, topTrackName: topTrack?.name ?? '', newArtists, gamingHours, musicMinutes: Math.round(music?.minutes ?? 0) });
    return { ...pick, signals: { plays24: plays, avgPerDay, nightPct, topTrackPlays, newArtists, gamingHours } };
  }

  /**
   * The day's listening shape — first track, peak hour + its track, last track —
   * for today, or (if today is silent so far) your most recent active day. The
   * reference date is returned so the UI can label it honestly.
   */
  async todayTimeline(userId: string) {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;
    const iv = `${tz} minutes`;

    const [ref] = await this.prisma.$queryRaw<Array<{ day: string | null; is_today: boolean }>>`
      SELECT to_char(MAX(("playedAt" + (${iv})::interval)::date), 'YYYY-MM-DD') AS day,
             MAX(("playedAt" + (${iv})::interval)::date) = (now() + (${iv})::interval)::date AS is_today
      FROM listening_history WHERE "userId" = ${userId}
    `;
    if (!ref?.day) return { day: null, isToday: false, plays: 0, first: null, peak: null, last: null };
    const day = ref.day;

    const [edges] = await this.prisma.$queryRaw<Array<{ plays: number }>>`
      SELECT COUNT(*)::int AS plays FROM listening_history
      WHERE "userId" = ${userId} AND (("playedAt" + (${iv})::interval)::date = ${day}::date)
    `;
    const [firstRow] = await this.prisma.$queryRaw<Array<{ name: string; at: Date }>>`
      SELECT t.name, lh."playedAt" AS at FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId} AND ((lh."playedAt" + (${iv})::interval)::date = ${day}::date)
      ORDER BY lh."playedAt" ASC LIMIT 1
    `;
    const [lastRow] = await this.prisma.$queryRaw<Array<{ name: string; at: Date }>>`
      SELECT t.name, lh."playedAt" AS at FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId} AND ((lh."playedAt" + (${iv})::interval)::date = ${day}::date)
      ORDER BY lh."playedAt" DESC LIMIT 1
    `;
    const [peak] = await this.prisma.$queryRaw<Array<{ hour: number; plays: number; track: string }>>`
      WITH d AS (
        SELECT t.name, EXTRACT(HOUR FROM lh."playedAt" + (${iv})::interval)::int AS h
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        WHERE lh."userId" = ${userId} AND ((lh."playedAt" + (${iv})::interval)::date = ${day}::date)
      ),
      hours AS (SELECT h, COUNT(*) c FROM d GROUP BY h ORDER BY c DESC LIMIT 1),
      tt AS (SELECT d.name, COUNT(*) c FROM d JOIN hours hh ON hh.h = d.h GROUP BY d.name ORDER BY c DESC LIMIT 1)
      SELECT hours.h AS hour, hours.c::int AS plays, tt.name AS track FROM hours, tt
    `;
    return {
      day,
      isToday: ref.is_today,
      plays: edges?.plays ?? 0,
      first: firstRow ? { track: firstRow.name, at: firstRow.at } : null,
      last: lastRow ? { track: lastRow.name, at: lastRow.at } : null,
      peak: peak ? { hour: peak.hour, plays: peak.plays, track: peak.track } : null,
    };
  }

  /** Detail for one calendar day (local): minutes, plays, top track/artist, new entries. */
  async dayDetail(userId: string, day: string) {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;
    const iv = `${tz} minutes`;

    const [agg] = await this.prisma.$queryRaw<Array<{ plays: number; minutes: number }>>`
      SELECT COUNT(*)::int AS plays, (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes
      FROM listening_history
      WHERE "userId" = ${userId} AND (("playedAt" + (${iv})::interval)::date = ${day}::date)
    `;
    const [track] = await this.prisma.$queryRaw<Array<{ name: string; artist: string | null; plays: number }>>`
      SELECT t.name, a.name AS artist, COUNT(*)::int AS plays
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" LEFT JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND ((lh."playedAt" + (${iv})::interval)::date = ${day}::date)
      GROUP BY t.name, a.name ORDER BY plays DESC LIMIT 1
    `;
    const [artist] = await this.prisma.$queryRaw<Array<{ name: string; plays: number }>>`
      SELECT a.name, COUNT(*)::int AS plays
      FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND ((lh."playedAt" + (${iv})::interval)::date = ${day}::date)
      GROUP BY a.name ORDER BY plays DESC LIMIT 1
    `;
    const [fresh] = await this.prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT a.name FROM (
        SELECT "artistId", MIN("playedAt") AS first FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL GROUP BY "artistId"
      ) f JOIN artists a ON a.id = f."artistId"
      WHERE (f.first + (${iv})::interval)::date = ${day}::date
      ORDER BY a.name LIMIT 1
    `;
    return {
      day,
      plays: agg?.plays ?? 0,
      minutes: Math.round(agg?.minutes ?? 0),
      topTrack: track ? { name: track.name, artist: track.artist } : null,
      topArtist: artist?.name ?? null,
      newEntry: fresh?.name ?? null,
    };
  }

  /**
   * "Resumen de la semana" — this week vs last week (music minutes/plays + gaming
   * hours), whether it's a record week, plus the week's musical comeback and the
   * obsession track. All from real data; gaming fills in as snapshots accumulate.
   */
  async weeklyRecap(userId: string) {
    const [music] = await this.prisma.$queryRaw<
      Array<{ plays_tw: number; plays_lw: number; min_tw: number; min_lw: number; artists_tw: number; tracks_tw: number; albums_tw: number }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days')::int AS plays_tw,
        COUNT(*) FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '14 days' AND lh."playedAt" < NOW() - INTERVAL '7 days')::int AS plays_lw,
        (COALESCE(SUM(lh."msPlayed") FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days'), 0) / 60000.0)::float AS min_tw,
        (COALESCE(SUM(lh."msPlayed") FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '14 days' AND lh."playedAt" < NOW() - INTERVAL '7 days'), 0) / 60000.0)::float AS min_lw,
        COUNT(DISTINCT lh."artistId") FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days')::int AS artists_tw,
        COUNT(DISTINCT lh."trackId") FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days')::int AS tracks_tw,
        COUNT(DISTINCT t."albumId") FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days')::int AS albums_tw
      FROM listening_history lh LEFT JOIN tracks t ON t.id = lh."trackId" WHERE lh."userId" = ${userId}
    `;
    const [record] = await this.prisma.$queryRaw<Array<{ best: number | null }>>`
      SELECT MAX(wk)::float AS best FROM (
        SELECT SUM("msPlayed") / 60000.0 AS wk
        FROM listening_history
        WHERE "userId" = ${userId} AND date_trunc('week', "playedAt") < date_trunc('week', NOW())
        GROUP BY date_trunc('week', "playedAt")
      ) s
    `;
    const [game] = await this.prisma.$queryRaw<Array<{ gam_tw: number; gam_lw: number }>>`
      WITH b7 AS (
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins FROM steam_game_snapshots
        WHERE "userId" = ${userId} AND "capturedAt" <= NOW() - INTERVAL '7 days' ORDER BY "appId", "capturedAt" DESC
      ), b14 AS (
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins FROM steam_game_snapshots
        WHERE "userId" = ${userId} AND "capturedAt" <= NOW() - INTERVAL '14 days' ORDER BY "appId", "capturedAt" DESC
      )
      SELECT
        COALESCE((SELECT SUM(GREATEST(0, ug."playtimeForever" - b7.mins)) FROM user_games ug JOIN steam_games g ON g.id = ug."gameId" JOIN b7 ON b7."appId" = g."appId" WHERE ug."userId" = ${userId}), 0)::float / 60.0 AS gam_tw,
        COALESCE((SELECT SUM(GREATEST(0, b7.mins - b14.mins)) FROM b7 JOIN b14 ON b14."appId" = b7."appId"), 0)::float / 60.0 AS gam_lw
    `;
    const [comeback] = await this.prisma.$queryRaw<Array<{ name: string; gap_days: number; tw_plays: number }>>`
      WITH lb AS (
        SELECT a.name,
          MAX(lh."playedAt") FILTER (WHERE lh."playedAt" < NOW() - INTERVAL '7 days') AS prev,
          COUNT(*) FILTER (WHERE lh."playedAt" >= NOW() - INTERVAL '7 days')::int AS tw_plays
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
        GROUP BY a.name
      )
      SELECT name, (EXTRACT(EPOCH FROM (NOW() - prev)) / 86400)::int AS gap_days, tw_plays
      FROM lb WHERE tw_plays >= 3 AND prev IS NOT NULL AND prev < NOW() - INTERVAL '67 days'
      ORDER BY prev ASC LIMIT 1
    `;
    const [obsession] = await this.prisma.$queryRaw<Array<{ name: string; artist: string | null; plays: number }>>`
      SELECT t.name, a.name AS artist, COUNT(*)::int AS plays
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" LEFT JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY t.name, a.name ORDER BY plays DESC LIMIT 1
    `;
    const [weekArtist] = await this.prisma.$queryRaw<Array<{ name: string; plays: number }>>`
      SELECT a.name, COUNT(*)::int AS plays
      FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL AND lh."playedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY a.name ORDER BY plays DESC LIMIT 1
    `;

    const [vibe] = await this.prisma.$queryRaw<Array<{ night_tw: number; night_lw: number; new_artists: number }>>`
      SELECT
        (COUNT(*) FILTER (WHERE "playedAt" >= NOW() - INTERVAL '7 days' AND (EXTRACT(HOUR FROM "playedAt") >= 22 OR EXTRACT(HOUR FROM "playedAt") < 6))::float
          / NULLIF(COUNT(*) FILTER (WHERE "playedAt" >= NOW() - INTERVAL '7 days'), 0)) AS night_tw,
        (COUNT(*) FILTER (WHERE "playedAt" >= NOW() - INTERVAL '14 days' AND "playedAt" < NOW() - INTERVAL '7 days' AND (EXTRACT(HOUR FROM "playedAt") >= 22 OR EXTRACT(HOUR FROM "playedAt") < 6))::float
          / NULLIF(COUNT(*) FILTER (WHERE "playedAt" >= NOW() - INTERVAL '14 days' AND "playedAt" < NOW() - INTERVAL '7 days'), 0)) AS night_lw,
        (SELECT COUNT(*)::int FROM (
          SELECT "artistId" FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
          GROUP BY "artistId" HAVING MIN("playedAt") >= NOW() - INTERVAL '7 days'
        ) x) AS new_artists
      FROM listening_history WHERE "userId" = ${userId}
    `;

    const r1 = (n: number) => Math.round(n);
    const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
    const minTw = r1(music?.min_tw ?? 0);
    const best = record?.best ?? 0;
    const nightTw = Math.round((vibe?.night_tw ?? 0) * 100);
    const nightLw = Math.round((vibe?.night_lw ?? 0) * 100);

    return {
      thisWeek: {
        plays: music?.plays_tw ?? 0,
        minutes: minTw,
        gamingHours: Math.round((game?.gam_tw ?? 0) * 10) / 10,
        uniqueArtists: music?.artists_tw ?? 0,
        uniqueTracks: music?.tracks_tw ?? 0,
        uniqueAlbums: music?.albums_tw ?? 0,
      },
      lastWeek: { plays: music?.plays_lw ?? 0, minutes: r1(music?.min_lw ?? 0), gamingHours: Math.round((game?.gam_lw ?? 0) * 10) / 10 },
      deltas: {
        playsPct: pct(music?.plays_tw ?? 0, music?.plays_lw ?? 0),
        minutesPct: pct(music?.min_tw ?? 0, music?.min_lw ?? 0),
        gamingPct: pct(game?.gam_tw ?? 0, game?.gam_lw ?? 0),
      },
      vibe: { nightPct: nightTw, nightShift: nightTw - nightLw, newArtists: vibe?.new_artists ?? 0 },
      recordWeekMinutes: r1(best),
      isRecordWeek: minTw > 0 && minTw >= best,
      topArtist: weekArtist ? { name: weekArtist.name, plays: weekArtist.plays } : null,
      comebackArtist: comeback ? { name: comeback.name, gapDays: comeback.gap_days, plays: comeback.tw_plays } : null,
      obsessionTrack: obsession ? { name: obsession.name, artist: obsession.artist, plays: obsession.plays } : null,
    };
  }

  private pickActivityState(m: {
    plays: number;
    avgPerDay: number;
    intensity: number;
    nightPct: number;
    topTrackPlays: number;
    topTrackName: string;
    newArtists: number;
    gamingHours: number;
    musicMinutes: number;
  }): { state: string; label: string; reason: string } {
    // Quiet day: barely any music and no gaming.
    if (m.plays < 10 && m.gamingHours < 0.5)
      return { state: 'silencioso', label: 'Silencioso', reason: 'Apenas actividad en las últimas 24 horas.' };
    // Gaming dominated the day.
    if (m.gamingHours >= 2 && m.gamingHours * 60 >= m.musicMinutes)
      return { state: 'gamer', label: 'Gamer', reason: `Porque sumaste +${m.gamingHours}h en Steam hoy.` };
    // Way above your usual listening volume.
    if (m.intensity >= 1.4 && m.avgPerDay > 0)
      return { state: 'intenso', label: 'Intenso', reason: `Porque escuchaste un ${Math.round((m.intensity - 1) * 100)}% más que tu promedio.` };
    // Looping one track hard.
    if (m.topTrackPlays >= 8)
      return { state: 'repetitivo', label: 'Repetitivo', reason: `Porque repetiste "${m.topTrackName}" ${m.topTrackPlays} veces.` };
    // Night-heavy.
    if (m.nightPct >= 50)
      return { state: 'nocturno', label: 'Nocturno', reason: `Porque el ${m.nightPct}% de tu música fue de madrugada.` };
    // Discovery.
    if (m.newArtists >= 10)
      return { state: 'explorador', label: 'Explorador', reason: `Porque descubriste ${m.newArtists} artistas nuevos hoy.` };
    // A bit of everything.
    const bits = [m.plays > 0 ? `${m.plays} reproducciones` : null, m.gamingHours > 0 ? `+${m.gamingHours}h de juego` : null].filter(Boolean);
    return { state: 'mixto', label: 'Mixto', reason: bits.length ? `Un poco de todo: ${bits.join(' y ')}.` : 'Actividad variada en las últimas 24 horas.' };
  }

  async top(userId: string, type: TopType, win: Window, limit: number): Promise<TopItem[]> {
    switch (type) {
      case 'tracks':
        return this.topTracks(userId, win, limit);
      case 'artists':
        return this.topArtists(userId, win, limit);
      case 'albums':
        return this.topAlbums(userId, win, limit);
      case 'genres':
        return this.topGenres(userId, win, limit);
    }
  }

  private async topTracks(userId: string, { start, end }: Window, limit: number): Promise<TopItem[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; plays: number; ms: number }>>`
      SELECT lh."trackId" AS id, COUNT(*)::int AS plays, SUM(lh."msPlayed")::float AS ms
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY lh."trackId"
      ORDER BY plays DESC, ms DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: {
        album: { select: { imageUrl: true } },
        artists: { include: { artist: { select: { id: true, name: true } } }, orderBy: { position: 'asc' } },
      },
    });
    const byId = new Map(tracks.map((t) => [t.id, t]));

    // Most imported tracks have no album linked → no cover. Fall back to the
    // primary artist's most-played album art so rows aren't blank.
    const missingArtistIds = tracks
      .filter((t) => !t.album?.imageUrl)
      .map((t) => t.artists[0]?.artist.id)
      .filter((id): id is string => Boolean(id));
    const fallback = await this.albumCoversForArtists(userId, missingArtistIds);

    return rows.map((r) => {
      const t = byId.get(r.id);
      const artistId = t?.artists[0]?.artist.id;
      return {
        id: r.id,
        name: t?.name ?? 'Desconocido',
        subtitle: t?.artists[0]?.artist.name,
        imageUrl: t?.album?.imageUrl ?? (artistId ? fallback.get(artistId) : null) ?? null,
        plays: r.plays,
        minutes: Math.round(r.ms / 60000),
      };
    });
  }

  private async topArtists(userId: string, { start, end }: Window, limit: number): Promise<TopItem[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; plays: number; ms: number }>>`
      SELECT lh."artistId" AS id, COUNT(*)::int AS plays, SUM(lh."msPlayed")::float AS ms
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
        AND lh."artistId" IS NOT NULL
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY lh."artistId"
      ORDER BY plays DESC, ms DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];

    const artists = await this.prisma.artist.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, name: true, imageUrl: true },
    });
    const byId = new Map(artists.map((a) => [a.id, a]));

    // ~94% of artists have no Spotify photo (imported). Fall back to the cover of
    // their most-played album so the ranking isn't full of blank squares.
    const missing = rows.map((r) => r.id).filter((id) => !byId.get(id)?.imageUrl);
    const fallback = await this.albumCoversForArtists(userId, missing);

    return rows.map((r) => {
      const a = byId.get(r.id);
      return {
        id: r.id,
        name: a?.name ?? 'Desconocido',
        imageUrl: a?.imageUrl ?? fallback.get(r.id) ?? null,
        plays: r.plays,
        minutes: Math.round(r.ms / 60000),
      };
    });
  }

  /**
   * For each artist, the cover art of the album they've played most (with art).
   * Used to fill missing artist photos and missing track covers from the album
   * art we DO have — avoids blank squares without hitting Spotify.
   */
  private async albumCoversForArtists(userId: string, artistIds: string[]): Promise<Map<string, string>> {
    if (artistIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ id: string; image: string }>>`
      SELECT DISTINCT ON (id) id, image FROM (
        SELECT lh."artistId" AS id, al."imageUrl" AS image, COUNT(*) AS c
        FROM listening_history lh
        JOIN tracks t ON t.id = lh."trackId"
        JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId}
          AND lh."artistId" IN (${Prisma.join(artistIds)})
          AND al."imageUrl" IS NOT NULL
        GROUP BY lh."artistId", al."imageUrl"
      ) s ORDER BY id, c DESC
    `;
    return new Map(rows.map((r) => [r.id, r.image]));
  }

  private async topAlbums(userId: string, { start, end }: Window, limit: number): Promise<TopItem[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; plays: number; ms: number }>>`
      SELECT t."albumId" AS id, COUNT(*)::int AS plays, SUM(lh."msPlayed")::float AS ms
      FROM listening_history lh
      JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId}
        AND t."albumId" IS NOT NULL
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY t."albumId"
      ORDER BY plays DESC, ms DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];

    const albums = await this.prisma.album.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { artists: { include: { artist: { select: { name: true } } } } },
    });
    const byId = new Map(albums.map((a) => [a.id, a]));

    return rows.map((r) => {
      const a = byId.get(r.id);
      return {
        id: r.id,
        name: a?.name ?? 'Desconocido',
        subtitle: a?.artists[0]?.artist.name,
        imageUrl: a?.imageUrl ?? null,
        plays: r.plays,
        minutes: Math.round(r.ms / 60000),
      };
    });
  }

  private async topGenres(userId: string, { start, end }: Window, limit: number): Promise<TopItem[]> {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; plays: number }>>`
      SELECT g.name AS name, COUNT(*)::int AS plays
      FROM listening_history lh
      JOIN artist_genres ag ON ag."artistId" = lh."artistId"
      JOIN genres g ON g.id = ag."genreId"
      WHERE lh."userId" = ${userId}
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY g.name
      ORDER BY plays DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ id: r.name, name: r.name, plays: r.plays, minutes: 0 }));
  }

  /** Minutes-per-day for the last `days`, with empty days filled in. */
  async series(userId: string, days: number): Promise<Array<{ day: string; minutes: number; plays: number }>> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const rows = await this.prisma.$queryRaw<Array<{ day: string; minutes: number; plays: number }>>`
      SELECT to_char(date_trunc('day', lh."playedAt"), 'YYYY-MM-DD') AS day,
             (SUM(lh."msPlayed") / 60000.0)::float AS minutes,
             COUNT(*)::int AS plays
      FROM listening_history lh
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= ${start}
      GROUP BY 1
      ORDER BY 1
    `;
    const byDay = new Map(rows.map((r) => [r.day, { minutes: Math.round(r.minutes), plays: r.plays }]));

    const out: Array<{ day: string; minutes: number; plays: number }> = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const v = byDay.get(key);
      out.push({ day: key.slice(5), minutes: v?.minutes ?? 0, plays: v?.plays ?? 0 });
    }
    return out;
  }

  /** Minutes per month across ALL history — the "Lifetime" energy view. */
  async monthlySeries(userId: string): Promise<Array<{ day: string; minutes: number; plays: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; minutes: number; plays: number }>>`
      SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym,
             (SUM("msPlayed") / 60000.0)::float AS minutes,
             COUNT(*)::int AS plays
      FROM listening_history WHERE "userId" = ${userId}
      GROUP BY 1 ORDER BY 1
    `;
    // Reuse the {day, minutes, plays} shape so the chart renders it unchanged; label MM/YY.
    return rows.map((r) => ({ day: `${r.ym.slice(5)}/${r.ym.slice(2, 4)}`, minutes: Math.round(r.minutes), plays: r.plays }));
  }

  /** Plays per hour-of-day (0-23) within the window, in local time. */
  async clock(userId: string, { start, end }: Window, tzOffset: number): Promise<Array<{ hour: number; plays: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ hour: number; plays: number }>>`
      SELECT EXTRACT(HOUR FROM lh."playedAt" + (${tzOffset} || ' minutes')::interval)::int AS hour,
             COUNT(*)::int AS plays
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY 1
    `;
    const map = new Map(rows.map((r) => [r.hour, r.plays]));
    return Array.from({ length: 24 }, (_, hour) => ({ hour, plays: map.get(hour) ?? 0 }));
  }

  /** Plays per weekday (0=Sun … 6=Sat) within the window, local time. */
  async weekdays(userId: string, { start, end }: Window, tzOffset: number): Promise<Array<{ dow: number; plays: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ dow: number; plays: number }>>`
      SELECT EXTRACT(DOW FROM lh."playedAt" + (${tzOffset} || ' minutes')::interval)::int AS dow,
             COUNT(*)::int AS plays
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
        AND (${start}::timestamptz IS NULL OR lh."playedAt" >= ${start})
        AND (${end}::timestamptz IS NULL OR lh."playedAt" < ${end})
      GROUP BY 1
    `;
    const map = new Map(rows.map((r) => [r.dow, r.plays]));
    return Array.from({ length: 7 }, (_, dow) => ({ dow, plays: map.get(dow) ?? 0 }));
  }

  /** Recent plays feed with timestamps, optionally scoped to a window. */
  async recent(userId: string, win: Window, limit: number) {
    const rows = await this.prisma.listeningHistory.findMany({
      where: {
        userId,
        ...(win.start || win.end
          ? { playedAt: { ...(win.start ? { gte: win.start } : {}), ...(win.end ? { lt: win.end } : {}) } }
          : {}),
      },
      orderBy: { playedAt: 'desc' },
      take: limit,
      select: {
        playedAt: true,
        msPlayed: true,
        track: {
          select: {
            name: true,
            album: { select: { imageUrl: true } },
            artists: {
              where: { position: 0 },
              select: { artist: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      playedAt: r.playedAt,
      name: r.track.name,
      artist: r.track.artists[0]?.artist.name ?? '',
      imageUrl: r.track.album?.imageUrl ?? null,
    }));
  }

  /** Comparador temporal: este mes/año vs el anterior. */
  async compare(userId: string, period: 'month' | 'year') {
    const now = new Date();
    let curStart: Date;
    let curEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;
    let curLabel: string;
    let prevLabel: string;

    if (period === 'month') {
      curStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      curEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      prevEnd = curStart;
      curLabel = curStart.toISOString().slice(0, 7);
      prevLabel = prevStart.toISOString().slice(0, 7);
    } else {
      curStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      curEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
      prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      prevEnd = curStart;
      curLabel = String(now.getUTCFullYear());
      prevLabel = String(now.getUTCFullYear() - 1);
    }

    const [cur, prev] = await Promise.all([
      this.windowMinutes(userId, curStart, curEnd),
      this.windowMinutes(userId, prevStart, prevEnd),
    ]);
    const deltaPct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

    return {
      period,
      current: { label: curLabel, minutes: cur },
      previous: { label: prevLabel, minutes: prev },
      deltaPct,
    };
  }

  private async windowMinutes(userId: string, start: Date, end: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ minutes: number }>>`
      SELECT (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes
      FROM listening_history
      WHERE "userId" = ${userId} AND "playedAt" >= ${start} AND "playedAt" < ${end}
    `;
    return Math.round(row?.minutes ?? 0);
  }
}
