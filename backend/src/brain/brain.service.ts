import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface Arch {
  key: string;
  label: string;
  emoji: string;
}
interface WinMetrics {
  plays: number;
  artists: number;
  tracks: number;
  night: number;
  days: number;
  newArtists: number;
}

export interface Detection {
  kind: 'music' | 'gaming';
  changed: boolean;
  from: string;
  to: string;
  fromEmoji: string;
  toEmoji: string;
  reason: string;
}

export interface EvolutionPoint {
  ym: string;
  plays: number;
  minutes: number;
  uniqueArtists: number;
  newArtists: number;
  topArtist: string | null;
  archetype: Arch;
}

export interface PeriodSnapshot {
  ym: string;
  hasData: boolean;
  plays: number;
  minutes: number;
  uniqueArtists: number;
  topArtist: { id: string; name: string } | null;
  topTrack: { id: string; name: string; image: string | null } | null;
  topAlbum: { name: string; image: string | null } | null;
  archetype: Arch;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const GAMER_ARCH: Record<string, { label: string; emoji: string; genres: string[] }> = {
  constructor: { label: 'Constructor', emoji: '🏗️', genres: ['Strategy', 'Simulation'] },
  competitivo: { label: 'Competitivo', emoji: '⚔️', genres: ['Action', 'Massively Multiplayer', 'Sports', 'Racing', 'Fighting'] },
  aventurero: { label: 'Aventurero', emoji: '🧭', genres: ['Adventure', 'RPG', 'Indie'] },
  casual: { label: 'Casual', emoji: '🎲', genres: ['Casual', 'Free to Play'] },
};

/**
 * "Steatify Brain" — the layer ON TOP that answers "¿qué está pasando contigo?".
 * It detects STAGE CHANGES by comparing your recent self to your prior self
 * (music: last 30d vs the 30d before; gaming: recent genre mix vs all-time) and
 * narrates the shift with the real metric behind it. Also powers "Tú vs Tú".
 */
@Injectable()
export class BrainService {
  constructor(private readonly prisma: PrismaService) {}

  async brain(userId: string): Promise<{ detections: Detection[] }> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;
    const [music, gaming] = await Promise.all([this.musicDetection(userId, tz), this.gamingDetection(userId)]);
    return { detections: [music, gaming].filter((d): d is Detection => d != null) };
  }

  // ── music stage change ───────────────────────────────────────────────────────
  private async musicDetection(userId: string, tz: number): Promise<Detection | null> {
    const [now, prev] = await Promise.all([this.windowMetrics(userId, 0, 30, tz), this.windowMetrics(userId, 30, 60, tz)]);
    if (now.plays < 30 || prev.plays < 30) return null;

    const an = musicArchetype(now);
    const ap = musicArchetype(prev);
    const repeatNow = now.tracks > 0 ? now.plays / now.tracks : 0;
    const repeatPrev = prev.tracks > 0 ? prev.plays / prev.tracks : 0;
    const repeatDrop = repeatPrev > 0 ? Math.round(((repeatPrev - repeatNow) / repeatPrev) * 100) : 0;
    const nightPct = now.plays > 0 ? Math.round((now.night / now.plays) * 100) : 0;

    let reason: string;
    switch (an.key) {
      case 'explorador':
        reason = `+${now.newArtists} artistas nuevos${repeatDrop > 10 ? `, −${repeatDrop}% repetición` : ''}.`;
        break;
      case 'obsesivo':
        reason = `Repites cada canción ${repeatNow.toFixed(1)} veces de media.`;
        break;
      case 'nocturno':
        reason = `${nightPct}% de tu música fue de madrugada.`;
        break;
      case 'maratonista':
        reason = `${now.plays} reproducciones en 30 días.`;
        break;
      default:
        reason = `${now.artists} artistas, ${now.plays} reproducciones este mes.`;
    }
    return { kind: 'music', changed: an.key !== ap.key, from: ap.label, to: an.label, fromEmoji: ap.emoji, toEmoji: an.emoji, reason };
  }

  private async windowMetrics(userId: string, fromDays: number, toDays: number, tz: number): Promise<WinMetrics> {
    const [m] = await this.prisma.$queryRaw<Array<{ plays: number; artists: number; tracks: number; night: number; days: number }>>`
      SELECT COUNT(*)::int AS plays,
        COUNT(DISTINCT "artistId")::int AS artists,
        COUNT(DISTINCT "trackId")::int AS tracks,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                            OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6)::int AS night,
        COUNT(DISTINCT date_trunc('day', "playedAt"))::int AS days
      FROM listening_history
      WHERE "userId" = ${userId} AND "playedAt" >= now() - (${toDays} || ' days')::interval AND "playedAt" < now() - (${fromDays} || ' days')::interval
    `;
    const [na] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM (
        SELECT DISTINCT "artistId" FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
          AND "playedAt" >= now() - (${toDays} || ' days')::interval AND "playedAt" < now() - (${fromDays} || ' days')::interval
          AND "artistId" NOT IN (
            SELECT DISTINCT "artistId" FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
            AND "playedAt" < now() - (${toDays} || ' days')::interval AND "playedAt" >= now() - (${toDays + 365} || ' days')::interval
          )
      ) x
    `;
    return { plays: m?.plays ?? 0, artists: m?.artists ?? 0, tracks: m?.tracks ?? 0, night: m?.night ?? 0, days: m?.days ?? 0, newArtists: na?.c ?? 0 };
  }

  // ── gaming stage change ──────────────────────────────────────────────────────
  private async gamingDetection(userId: string): Promise<Detection | null> {
    const recent = await this.prisma.$queryRaw<Array<{ genre: string; h: number }>>`
      SELECT unnest(g.genres) AS genre, (SUM(ug."playtime2Weeks") / 60.0)::float AS h
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId} AND ug."playtime2Weeks" > 0 AND array_length(g.genres, 1) > 0
      GROUP BY 1
    `;
    const allTime = await this.prisma.$queryRaw<Array<{ genre: string; h: number }>>`
      SELECT unnest(g.genres) AS genre, (SUM(ug."playtimeForever") / 60.0)::float AS h
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId} AND ug."playtimeForever" > 0 AND array_length(g.genres, 1) > 0
      GROUP BY 1
    `;
    const recentTotal = recent.reduce((s, r) => s + r.h, 0);
    if (recentTotal < 2) return null; // not enough recent gaming to call a shift

    const an = gamerArchetype(recent);
    const ap = gamerArchetype(allTime);
    const topRecentGenre = [...recent].sort((a, b) => b.h - a.h)[0];
    const reason = `+${Math.round(topRecentGenre?.h ?? 0)}h en ${topRecentGenre?.genre ?? 'juegos'} últimamente.`;
    return { kind: 'gaming', changed: an.key !== ap.key, from: ap.label, to: an.label, fromEmoji: ap.emoji, toEmoji: an.emoji, reason };
  }

  // ── Evolución ADN ────────────────────────────────────────────────────────────
  /**
   * Timeline of your music archetype, month by month. Reuses the same scoring as
   * the live Brain, but per calendar month — so you can see when you shifted from
   * Explorador → Obsesivo → Nocturno over the last `months`.
   */
  async evolution(userId: string, months = 12): Promise<{ timeline: EvolutionPoint[] }> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;

    const rows = await this.prisma.$queryRaw<
      Array<{ ym: string; plays: number; minutes: number; artists: number; tracks: number; night: number; days: number }>
    >`
      SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym,
        COUNT(*)::int AS plays,
        (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes,
        COUNT(DISTINCT "artistId")::int AS artists,
        COUNT(DISTINCT "trackId")::int AS tracks,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                            OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6)::int AS night,
        COUNT(DISTINCT date_trunc('day', "playedAt"))::int AS days
      FROM listening_history
      WHERE "userId" = ${userId}
        AND "playedAt" >= date_trunc('month', now()) - ((${months} - 1) || ' months')::interval
      GROUP BY 1 ORDER BY 1
    `;

    // New artists discovered in each month = artists whose first-ever play lands there.
    const naRows = await this.prisma.$queryRaw<Array<{ ym: string; n: number }>>`
      SELECT to_char(fm, 'YYYY-MM') AS ym, COUNT(*)::int AS n FROM (
        SELECT "artistId", date_trunc('month', MIN("playedAt")) AS fm
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL GROUP BY 1
      ) f GROUP BY 1
    `;
    const naBy = new Map(naRows.map((r) => [r.ym, r.n]));

    const taRows = await this.prisma.$queryRaw<Array<{ ym: string; name: string }>>`
      SELECT DISTINCT ON (ym) ym, name FROM (
        SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, a.name, COUNT(*) AS c
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
        GROUP BY 1, 2
      ) s ORDER BY ym, c DESC
    `;
    const taBy = new Map(taRows.map((r) => [r.ym, r.name]));

    // Per-month raw signals. We label each month by the trait that stood out
    // RELATIVE to this user's own average — absolute thresholds are useless for a
    // power listener (volume saturates every month, hiding every other shift).
    const signals = rows.map((r) => {
      const newArtists = naBy.get(r.ym) ?? 0;
      return {
        explore: r.artists > 0 ? newArtists / r.artists : 0,
        repeat: r.tracks > 0 ? r.plays / r.tracks : 0,
        night: r.plays > 0 ? r.night / r.plays : 0,
        volume: r.days > 0 ? r.plays / r.days : 0,
      };
    });
    const mean = (sel: (s: (typeof signals)[number]) => number) => {
      const vals = signals.map(sel).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const avg = {
      explore: mean((s) => s.explore),
      repeat: mean((s) => s.repeat),
      night: mean((s) => s.night),
      volume: mean((s) => s.volume),
    };

    const timeline = rows.map((r, i) => {
      const newArtists = naBy.get(r.ym) ?? 0;
      const archetype = relativeArchetype(signals[i], avg);
      return {
        ym: r.ym,
        plays: r.plays,
        minutes: Math.round(r.minutes),
        uniqueArtists: r.artists,
        newArtists,
        topArtist: taBy.get(r.ym) ?? null,
        archetype,
      };
    });
    return { timeline };
  }

  // ── Tú vs Tú ─────────────────────────────────────────────────────────────────
  async versus(userId: string, ymA: string, ymB: string): Promise<{ a: PeriodSnapshot; b: PeriodSnapshot }> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;
    const [a, b] = await Promise.all([this.monthSnapshot(userId, ymA, tz), this.monthSnapshot(userId, ymB, tz)]);
    return { a, b };
  }

  private async monthSnapshot(userId: string, ym: string, tz: number): Promise<PeriodSnapshot> {
    const [agg] = await this.prisma.$queryRaw<Array<{ plays: number; minutes: number; artists: number; tracks: number; night: number; days: number; newartists: number }>>`
      SELECT COUNT(*)::int AS plays, (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes,
        COUNT(DISTINCT "artistId")::int AS artists, COUNT(DISTINCT "trackId")::int AS tracks,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                            OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6)::int AS night,
        COUNT(DISTINCT date_trunc('day', "playedAt"))::int AS days,
        0 AS newartists
      FROM listening_history WHERE "userId" = ${userId} AND to_char(date_trunc('month', "playedAt"), 'YYYY-MM') = ${ym}
    `;
    if (!agg || agg.plays === 0) {
      return { ym, hasData: false, plays: 0, minutes: 0, uniqueArtists: 0, topArtist: null, topTrack: null, topAlbum: null, archetype: { key: 'none', label: 'Sin datos', emoji: '🌫️' } };
    }
    const [topArtist] = await this.prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT lh."artistId" AS id, a.name FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL AND to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') = ${ym}
      GROUP BY lh."artistId", a.name ORDER BY COUNT(*) DESC LIMIT 1
    `;
    const [topTrack] = await this.prisma.$queryRaw<Array<{ id: string; name: string; image: string | null }>>`
      SELECT lh."trackId" AS id, t.name, al."imageUrl" AS image FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      LEFT JOIN albums al ON al.id = t."albumId"
      WHERE lh."userId" = ${userId} AND to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') = ${ym}
      GROUP BY lh."trackId", t.name, al."imageUrl" ORDER BY COUNT(*) DESC LIMIT 1
    `;
    const [topAlbum] = await this.prisma.$queryRaw<Array<{ name: string; image: string | null }>>`
      SELECT al.name, al."imageUrl" AS image FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" JOIN albums al ON al.id = t."albumId"
      WHERE lh."userId" = ${userId} AND to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') = ${ym}
      GROUP BY al.name, al."imageUrl" ORDER BY COUNT(*) DESC LIMIT 1
    `;
    const archetype = musicArchetype({ plays: agg.plays, artists: agg.artists, tracks: agg.tracks, night: agg.night, days: agg.days, newArtists: agg.newartists });

    return {
      ym,
      hasData: true,
      plays: agg.plays,
      minutes: Math.round(agg.minutes),
      uniqueArtists: agg.artists,
      topArtist: topArtist ? { id: topArtist.id, name: topArtist.name } : null,
      topTrack: topTrack ? { id: topTrack.id, name: topTrack.name, image: topTrack.image } : null,
      topAlbum: topAlbum ? { name: topAlbum.name, image: topAlbum.image } : null,
      archetype,
    };
  }
}

function musicArchetype(m: WinMetrics): Arch {
  const repeatRate = m.tracks > 0 ? m.plays / m.tracks : 0;
  const nightRatio = m.plays > 0 ? m.night / m.plays : 0;
  const exploration = m.artists > 0 ? m.newArtists / m.artists : 0;
  const perDay = m.days > 0 ? m.plays / m.days : 0;
  const scores: Array<[string, string, string, number]> = [
    ['explorador', 'Explorador', '🧭', clamp01(exploration * 1.6)],
    ['obsesivo', 'Obsesivo', '🔁', clamp01((repeatRate - 1) / 2.2)],
    ['nocturno', 'Nocturno', '🌙', clamp01(nightRatio * 1.4)],
    ['maratonista', 'Maratonista', '🎧', clamp01(perDay / 45)],
  ];
  scores.sort((a, b) => b[3] - a[3]);
  if (scores[0][3] < 0.3) return { key: 'constante', label: 'Constante', emoji: '🎶' };
  return { key: scores[0][0], label: scores[0][1], emoji: scores[0][2] };
}

/**
 * Label a month by the trait most above the user's own baseline. Returns the
 * standout archetype, or "Constante" when nothing exceeds the baseline enough.
 */
function relativeArchetype(
  s: { explore: number; repeat: number; night: number; volume: number },
  avg: { explore: number; repeat: number; night: number; volume: number },
): Arch {
  const rel = (v: number, m: number) => (m > 0 ? v / m : 0);
  const scores: Array<[string, string, string, number]> = [
    ['explorador', 'Explorador', '🧭', rel(s.explore, avg.explore)],
    ['obsesivo', 'Obsesivo', '🔁', rel(s.repeat, avg.repeat)],
    ['nocturno', 'Nocturno', '🌙', rel(s.night, avg.night)],
    ['maratonista', 'Maratonista', '🎧', rel(s.volume, avg.volume)],
  ];
  scores.sort((a, b) => b[3] - a[3]);
  if (scores[0][3] < 1.12) return { key: 'constante', label: 'Constante', emoji: '🎶' };
  return { key: scores[0][0], label: scores[0][1], emoji: scores[0][2] };
}

function gamerArchetype(genres: Array<{ genre: string; h: number }>): Arch {
  const totals: Record<string, number> = {};
  for (const [key, meta] of Object.entries(GAMER_ARCH)) {
    totals[key] = genres.filter((g) => meta.genres.includes(g.genre)).reduce((s, g) => s + g.h, 0);
  }
  const top = Object.entries(totals).sort(([, a], [, b]) => b - a)[0];
  if (!top || top[1] <= 0) return { key: 'aventurero', label: GAMER_ARCH.aventurero.label, emoji: GAMER_ARCH.aventurero.emoji };
  return { key: top[0], label: GAMER_ARCH[top[0]].label, emoji: GAMER_ARCH[top[0]].emoji };
}
