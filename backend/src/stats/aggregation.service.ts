import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { moodFrom } from '../common/mood.util';

interface DayAgg {
  day: string; // YYYY-MM-DD
  ms: number;
  plays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  valence: number | null;
  energy: number | null;
}

/**
 * Rebuilds the `daily_stats` rollup for a window of recent days. Idempotent —
 * recomputes from raw history and upserts. Runs after each sync (cheap: only the
 * last couple of days) so the contribution graph and historic views stay fresh
 * without scanning the whole history at read time.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recompute msPlayed for recent SPOTIFY_RECENT plays as the gap to the next
   * play, capped at the track's duration. The recently-played API doesn't tell
   * us how long a track was actually heard, so without this every skip counts as
   * a full listen and minutes inflate. IMPORT_EXTENDED rows already carry real
   * ms_played and are left untouched.
   */
  async recomputeMsPlayed(userId: string, days = 3): Promise<void> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    await this.prisma.$executeRaw`
      WITH gaps AS (
        SELECT lh.id, lh."playedAt", t."durationMs",
               LEAD(lh."playedAt") OVER (PARTITION BY lh."userId" ORDER BY lh."playedAt") AS next_at
        FROM listening_history lh
        JOIN tracks t ON t.id = lh."trackId"
        WHERE lh."userId" = ${userId}
          AND lh.source = 'SPOTIFY_RECENT'
          AND lh."playedAt" >= ${start}
      )
      UPDATE listening_history lh
      SET "msPlayed" = CASE
        -- Last play has no "next": use the real duration, or a 3.5-min default
        -- when the track duration is unknown (durationMs = 0, e.g. imported).
        WHEN g.next_at IS NULL THEN COALESCE(NULLIF(g."durationMs", 0), 210000)
        ELSE LEAST(
          -- Cap at the real duration, or a sane 8-min ceiling if unknown — so a
          -- long pause doesn't inflate one play, but a 0-duration track no longer
          -- collapses listened-minutes to zero.
          COALESCE(NULLIF(g."durationMs", 0), 480000),
          GREATEST(0, (EXTRACT(EPOCH FROM (g.next_at - g."playedAt")) * 1000))::int
        )
      END
      FROM gaps g
      WHERE lh.id = g.id
    `;
  }

  async recomputeRecentDays(userId: string, days = 2): Promise<void> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const rows = await this.prisma.$queryRaw<DayAgg[]>`
      SELECT to_char(date_trunc('day', lh."playedAt"), 'YYYY-MM-DD') AS day,
             SUM(lh."msPlayed")::float            AS ms,
             COUNT(*)::int                        AS plays,
             COUNT(DISTINCT lh."trackId")::int    AS "uniqueTracks",
             COUNT(DISTINCT lh."artistId")::int   AS "uniqueArtists",
             AVG(tf.valence)::float               AS valence,
             AVG(tf.energy)::float                AS energy
      FROM listening_history lh
      LEFT JOIN track_features tf ON tf."trackId" = lh."trackId"
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= ${start}
      GROUP BY 1
    `;
    await this.upsertDays(userId, rows);
  }

  /** Rebuild daily_stats for the user's ENTIRE history (used after an import). */
  async recomputeAllDays(userId: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<DayAgg[]>`
      SELECT to_char(date_trunc('day', lh."playedAt"), 'YYYY-MM-DD') AS day,
             SUM(lh."msPlayed")::float            AS ms,
             COUNT(*)::int                        AS plays,
             COUNT(DISTINCT lh."trackId")::int    AS "uniqueTracks",
             COUNT(DISTINCT lh."artistId")::int   AS "uniqueArtists",
             AVG(tf.valence)::float               AS valence,
             AVG(tf.energy)::float                AS energy
      FROM listening_history lh
      LEFT JOIN track_features tf ON tf."trackId" = lh."trackId"
      WHERE lh."userId" = ${userId}
      GROUP BY 1
    `;
    await this.upsertDays(userId, rows);
    this.logger.debug(`Recomputed ALL daily_stats (${rows.length} days) for user ${userId}`);
  }

  private async upsertDays(userId: string, rows: DayAgg[]): Promise<void> {
    for (const r of rows) {
      const day = new Date(`${r.day}T00:00:00.000Z`);
      const mood = r.valence != null && r.energy != null ? moodFrom(r.valence, r.energy) : null;
      const data = {
        msPlayed: Math.round(r.ms),
        playCount: r.plays,
        uniqueTracks: r.uniqueTracks,
        uniqueArtists: r.uniqueArtists,
        avgValence: r.valence,
        avgEnergy: r.energy,
        dominantMood: mood,
      };
      await this.prisma.dailyStat.upsert({
        where: { uniq_user_day: { userId, day } },
        create: { userId, day, ...data },
        update: data,
      });
    }
    this.logger.debug(`Recomputed ${rows.length} daily_stats for user ${userId}`);
  }

  /** Contribution-graph data: one entry per day for the last `days`, filled. */
  async contributionGraph(userId: string, days = 365) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const stats = await this.prisma.dailyStat.findMany({
      where: { userId, day: { gte: start } },
      select: { day: true, msPlayed: true, dominantMood: true },
      orderBy: { day: 'asc' },
    });
    const byDay = new Map(stats.map((s) => [s.day.toISOString().slice(0, 10), s]));

    const out: Array<{ day: string; minutes: number; mood: string | null }> = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const s = byDay.get(key);
      out.push({
        day: key,
        minutes: s ? Math.round(s.msPlayed / 60000) : 0,
        mood: s?.dominantMood ?? null,
      });
    }
    return out;
  }
}
