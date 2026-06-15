import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MlClientService } from '../ml/ml-client.service';

interface CandidateRow {
  track_id: string;
  title: string;
  artist: string;
  recent: number;
  prior: number;
  valence: number | null;
  energy: number | null;
}

/**
 * Predictor de obsesiones: surfaces tracks rising fast enough to break into the
 * user's top. The backend computes momentum features; the ML service scores
 * them. Phase 1-style heuristic today, drop-in model later (same contract).
 */
@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlClientService,
  ) {}

  async listForUser(userId: string) {
    const candidates = await this.prisma.obsessionCandidate.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: 10,
    });
    if (candidates.length === 0) return [];

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: candidates.map((c) => c.trackId) } },
      include: {
        album: { select: { imageUrl: true } },
        artists: { include: { artist: { select: { name: true } } }, orderBy: { position: 'asc' } },
      },
    });
    const byId = new Map(tracks.map((t) => [t.id, t]));

    return candidates.map((c) => {
      const t = byId.get(c.trackId);
      return {
        trackId: c.trackId,
        name: t?.name ?? 'Desconocido',
        artist: t?.artists[0]?.artist.name ?? '',
        imageUrl: t?.album?.imageUrl ?? null,
        score: c.score,
        recentPlays: c.recentPlays,
        growthRate: c.growthRate,
      };
    });
  }

  async run(userId: string): Promise<{ generated: number }> {
    const candidates = await this.gatherCandidates(userId);
    if (candidates.length === 0) return { generated: 0 };

    const scores = await this.ml.predictObsessions(
      userId,
      candidates.map((c) => ({
        track_id: c.track_id,
        title: c.title,
        artist: c.artist,
        plays: c.recent,
        valence: c.valence,
        energy: c.energy,
      })),
    );
    const scoreById = new Map(scores.map((s) => [s.track_id, s]));

    const predictedFor = new Date();
    predictedFor.setUTCHours(0, 0, 0, 0);

    // Replace today's predictions wholesale.
    await this.prisma.obsessionCandidate.deleteMany({ where: { userId, predictedFor } });

    const rows: Prisma.ObsessionCandidateCreateManyInput[] = candidates.map((c) => {
      const growth = c.prior > 0 ? (c.recent - c.prior) / c.prior : c.recent;
      return {
        userId,
        trackId: c.track_id,
        score: scoreById.get(c.track_id)?.score ?? 0,
        recentPlays: c.recent,
        growthRate: Number(growth.toFixed(3)),
        predictedFor,
        features: { recent: c.recent, prior: c.prior, valence: c.valence, energy: c.energy },
      };
    });
    await this.prisma.obsessionCandidate.createMany({ data: rows, skipDuplicates: true });

    this.logger.debug(`Stored ${rows.length} obsession candidates for ${userId}`);
    return { generated: rows.length };
  }

  /** Rising tracks: ≥2 plays in the last 7 days, with momentum vs the prior 2 weeks. */
  private async gatherCandidates(userId: string): Promise<CandidateRow[]> {
    return this.prisma.$queryRaw<CandidateRow[]>`
      SELECT t.id AS track_id, t.name AS title, COALESCE(a.name, '') AS artist,
             COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days')::int AS recent,
             COUNT(*) FILTER (
               WHERE lh."playedAt" >= now() - interval '21 days'
                 AND lh."playedAt" <  now() - interval '7 days'
             )::int AS prior,
             tf.valence, tf.energy
      FROM listening_history lh
      JOIN tracks t ON t.id = lh."trackId"
      LEFT JOIN track_features tf ON tf."trackId" = t.id
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
      LEFT JOIN artists a ON a.id = ta."artistId"
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= now() - interval '21 days'
      GROUP BY t.id, a.name, tf.valence, tf.energy
      HAVING COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days') >= 2
      ORDER BY recent DESC
      LIMIT 20
    `;
  }
}
