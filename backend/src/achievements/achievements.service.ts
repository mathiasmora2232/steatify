import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Metrics the achievement rules are evaluated against. Keys match seed `rule.metric`. */
interface UserMetrics {
  max_track_plays: number;
  hours_after_midnight: number;
  unique_artists: number;
  minutes_in_week: number;
  listening_streak_days: number;
  top_artist_repeat_years: number;
  total_plays: number;
  total_minutes: number;
  unique_tracks: number;
  distinct_albums: number;
  night_play_count: number;
  track_distinct_years: number;
  artist_dominant_months: number;
  max_track_comeback_days: number;
  // Gaming (Steam) — 0 when no Steam account is linked.
  steam_total_hours: number;
  steam_game_count: number;
  steam_unplayed: number;
  steam_played: number;
  steam_max_game_hours: number;
  steam_sim_hours: number;
  steam_barely_games: number;
}

interface Rule {
  metric: keyof UserMetrics;
  op: '>=' | '>' | '==';
  threshold: number;
}

/**
 * Data-driven achievements engine. Computes a handful of user metrics, then
 * evaluates every active AchievementDefinition's `rule` (stored as JSON) against
 * them — so new achievements are a row insert, no code change. Progress is
 * tracked toward each threshold; unlockedAt is set once and preserved.
 */
@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(userId: string): Promise<{ evaluated: number; unlocked: number }> {
    const metrics = await this.computeMetrics(userId);
    const defs = await this.prisma.achievementDefinition.findMany({ where: { active: true } });

    let unlocked = 0;
    for (const def of defs) {
      const rule = def.rule as unknown as Rule;
      const value = metrics[rule.metric] ?? 0;
      const satisfied = this.test(value, rule);
      const progress = Math.max(0, Math.min(1, rule.threshold > 0 ? value / rule.threshold : 0));

      const existing = await this.prisma.userAchievement.findUnique({
        where: { uniq_user_achievement: { userId, achievementId: def.id } },
      });
      const unlockedAt = existing?.unlockedAt ?? (satisfied ? new Date() : null);
      if (satisfied && !existing?.unlockedAt) unlocked += 1;

      await this.prisma.userAchievement.upsert({
        where: { uniq_user_achievement: { userId, achievementId: def.id } },
        create: {
          userId,
          achievementId: def.id,
          progress,
          unlockedAt,
          meta: { value, threshold: rule.threshold },
        },
        update: { progress, unlockedAt, meta: { value, threshold: rule.threshold } },
      });
    }
    this.logger.debug(`Achievements for ${userId}: ${unlocked} newly unlocked`);
    return { evaluated: defs.length, unlocked };
  }

  /** Definitions joined with the user's progress, for the achievements page. */
  async listForUser(userId: string) {
    const defs = await this.prisma.achievementDefinition.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { tier: 'asc' }],
    });
    const progress = await this.prisma.userAchievement.findMany({ where: { userId } });
    const byDef = new Map(progress.map((p) => [p.achievementId, p]));

    return defs.map((d) => {
      const p = byDef.get(d.id);
      return {
        code: d.code,
        name: d.name,
        description: d.description,
        emoji: d.emoji,
        category: d.category,
        points: d.points,
        secret: d.secret,
        progress: p?.progress ?? 0,
        unlocked: Boolean(p?.unlockedAt),
        unlockedAt: p?.unlockedAt ?? null,
        meta: p?.meta ?? null,
      };
    });
  }

  private test(value: number, rule: Rule): boolean {
    switch (rule.op) {
      case '>=':
        return value >= rule.threshold;
      case '>':
        return value > rule.threshold;
      case '==':
        return value === rule.threshold;
    }
  }

  private async computeMetrics(userId: string): Promise<UserMetrics> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))
        ?.tzOffset ?? 0;
    const [maxPlays, afterMidnight, uniqueArtists, weekMins, repeatYears, streak, totals, steam, extra, domMonths] =
      await Promise.all([
        this.maxTrackPlays(userId),
        this.hoursAfterMidnight(userId, tz),
        this.uniqueArtists(userId),
        this.maxWeekMinutes(userId),
        this.topArtistRepeatYears(userId),
        this.longestStreakDays(userId, tz),
        this.totals(userId),
        this.steamMetrics(userId),
        this.extraMusicMetrics(userId, tz),
        this.artistDominantMonths(userId),
      ]);
    return {
      max_track_plays: maxPlays,
      hours_after_midnight: afterMidnight,
      unique_artists: uniqueArtists,
      minutes_in_week: weekMins,
      listening_streak_days: streak,
      top_artist_repeat_years: repeatYears,
      total_plays: totals.plays,
      total_minutes: totals.minutes,
      artist_dominant_months: domMonths,
      ...extra,
      ...steam,
    };
  }

  /** Several music milestones in one pass: collection size, night count, a track's year-span and biggest comeback gap. */
  private async extraMusicMetrics(userId: string, tz: number): Promise<{
    unique_tracks: number;
    distinct_albums: number;
    night_play_count: number;
    track_distinct_years: number;
    max_track_comeback_days: number;
  }> {
    const [base] = await this.prisma.$queryRaw<Array<{ tracks: number; albums: number; night: number }>>`
      SELECT COUNT(DISTINCT lh."trackId")::int AS tracks,
             COUNT(DISTINCT t."albumId")::int AS albums,
             COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM lh."playedAt" + (${tz} || ' minutes')::interval) < 6)::int AS night
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId}
    `;
    const [years] = await this.prisma.$queryRaw<Array<{ y: number }>>`
      SELECT COALESCE(MAX(yc), 0)::int AS y FROM (
        SELECT COUNT(DISTINCT EXTRACT(YEAR FROM "playedAt")) AS yc
        FROM listening_history WHERE "userId" = ${userId} GROUP BY "trackId"
      ) s
    `;
    const [gap] = await this.prisma.$queryRaw<Array<{ g: number }>>`
      SELECT COALESCE(MAX(gap), 0)::int AS g FROM (
        SELECT (EXTRACT(EPOCH FROM ("playedAt" - LAG("playedAt") OVER (PARTITION BY "trackId" ORDER BY "playedAt"))) / 86400) AS gap
        FROM listening_history WHERE "userId" = ${userId}
      ) s
    `;
    return {
      unique_tracks: base?.tracks ?? 0,
      distinct_albums: base?.albums ?? 0,
      night_play_count: base?.night ?? 0,
      track_distinct_years: years?.y ?? 0,
      max_track_comeback_days: gap?.g ?? 0,
    };
  }

  /** Longest run of consecutive months a single artist was your monthly #1. */
  private async artistDominantMonths(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; artistId: string }>>`
      SELECT to_char(m, 'YYYY-MM') AS ym, "artistId" FROM (
        SELECT date_trunc('month', "playedAt") AS m, "artistId",
               ROW_NUMBER() OVER (PARTITION BY date_trunc('month', "playedAt") ORDER BY COUNT(*) DESC) AS rn
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY 1, "artistId"
      ) z WHERE rn = 1 ORDER BY ym
    `;
    // Longest consecutive same-artist run across the month sequence.
    let best = 0;
    let cur = 0;
    let prevArtist: string | null = null;
    let prevYm: string | null = null;
    const monthIdx = (ym: string) => {
      const [y, m] = ym.split('-').map(Number);
      return y * 12 + m;
    };
    for (const r of rows) {
      const consecutive = prevYm != null && monthIdx(r.ym) - monthIdx(prevYm) === 1;
      cur = consecutive && r.artistId === prevArtist ? cur + 1 : 1;
      best = Math.max(best, cur);
      prevArtist = r.artistId;
      prevYm = r.ym;
    }
    return best;
  }

  /** Gaming metrics from the user's Steam library (all 0 when not linked). */
  private async steamMetrics(userId: string): Promise<{
    steam_total_hours: number;
    steam_game_count: number;
    steam_unplayed: number;
    steam_played: number;
    steam_max_game_hours: number;
    steam_sim_hours: number;
    steam_barely_games: number;
  }> {
    const [row] = await this.prisma.$queryRaw<
      Array<{
        total_hours: number;
        game_count: number;
        unplayed: number;
        played: number;
        max_hours: number;
        sim_hours: number;
        barely: number;
      }>
    >`
      SELECT
        COALESCE(ROUND(SUM(ug."playtimeForever") / 60.0), 0)::int AS total_hours,
        COUNT(*)::int AS game_count,
        COUNT(*) FILTER (WHERE ug."playtimeForever" = 0)::int AS unplayed,
        COUNT(*) FILTER (WHERE ug."playtimeForever" > 0)::int AS played,
        COALESCE(ROUND(MAX(ug."playtimeForever") / 60.0), 0)::int AS max_hours,
        COALESCE(ROUND(SUM(ug."playtimeForever") FILTER (WHERE g.genres && ARRAY['Simulation','Strategy']) / 60.0), 0)::int AS sim_hours,
        COUNT(*) FILTER (WHERE ug."playtimeForever" > 0 AND ug."playtimeForever" < 120)::int AS barely
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId}
    `;
    return {
      steam_total_hours: row?.total_hours ?? 0,
      steam_game_count: row?.game_count ?? 0,
      steam_unplayed: row?.unplayed ?? 0,
      steam_played: row?.played ?? 0,
      steam_max_game_hours: row?.max_hours ?? 0,
      steam_sim_hours: row?.sim_hours ?? 0,
      steam_barely_games: row?.barely ?? 0,
    };
  }

  private async totals(userId: string): Promise<{ plays: number; minutes: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ plays: number; minutes: number }>>`
      SELECT COUNT(*)::int AS plays,
             (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes
      FROM listening_history WHERE "userId" = ${userId}
    `;
    return { plays: row?.plays ?? 0, minutes: Math.round(row?.minutes ?? 0) };
  }

  private async maxTrackPlays(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM listening_history
      WHERE "userId" = ${userId}
      GROUP BY "trackId" ORDER BY c DESC LIMIT 1
    `;
    return row?.c ?? 0;
  }

  private async hoursAfterMidnight(userId: string, tz: number): Promise<number> {
    // "After midnight" = local hours 0–5.
    const [row] = await this.prisma.$queryRaw<Array<{ h: number }>>`
      SELECT (COALESCE(SUM("msPlayed"), 0) / 3600000.0)::float AS h
      FROM listening_history
      WHERE "userId" = ${userId}
        AND EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6
    `;
    return Math.round(row?.h ?? 0);
  }

  private async uniqueArtists(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(DISTINCT "artistId")::int AS c FROM listening_history WHERE "userId" = ${userId}
    `;
    return row?.c ?? 0;
  }

  private async maxWeekMinutes(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ m: number }>>`
      SELECT COALESCE(MAX(m), 0)::float AS m FROM (
        SELECT SUM("msPlayed") / 60000.0 AS m
        FROM listening_history
        WHERE "userId" = ${userId}
        GROUP BY date_trunc('week', "playedAt")
      ) s
    `;
    return Math.round(row?.m ?? 0);
  }

  private async topArtistRepeatYears(userId: string): Promise<number> {
    // Per year, rank artists by plays; the #1 per year is rn=1. Then count how
    // many years each artist was #1. Aggregation is nested so the window
    // function operates on plain columns (avoids GROUP-BY/window conflicts).
    const [row] = await this.prisma.$queryRaw<Array<{ repeats: number }>>`
      WITH yearly AS (
        SELECT y, "artistId",
               ROW_NUMBER() OVER (PARTITION BY y ORDER BY c DESC) AS rn
        FROM (
          SELECT EXTRACT(YEAR FROM "playedAt")::int AS y, "artistId", COUNT(*)::int AS c
          FROM listening_history
          WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
          GROUP BY 1, "artistId"
        ) t
      )
      SELECT COUNT(*)::int AS repeats FROM yearly WHERE rn = 1
      GROUP BY "artistId" ORDER BY repeats DESC LIMIT 1
    `;
    return row?.repeats ?? 0;
  }

  private async longestStreakDays(userId: string, tz: number): Promise<number> {
    const days = await this.prisma.$queryRaw<Array<{ d: Date }>>`
      SELECT DISTINCT date_trunc('day', "playedAt" + (${tz} || ' minutes')::interval)::date AS d
      FROM listening_history WHERE "userId" = ${userId} ORDER BY d
    `;
    let best = 0;
    let cur = 0;
    let prev: number | null = null;
    for (const { d } of days) {
      const t = new Date(d).getTime();
      if (prev !== null && t - prev === 86_400_000) cur += 1;
      else cur = 1;
      best = Math.max(best, cur);
      prev = t;
    }
    return best;
  }
}
