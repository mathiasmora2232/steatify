import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma, PlaySource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { AggregationService } from '../stats/aggregation.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ErasService } from '../eras/eras.service';
import { MusicEventsService } from '../events/music-events.service';
import { IMPORT_QUEUE, TRACK_URI_PREFIX, ExtendedImportJobData } from './import.constants';

const DB_CHUNK = 500; // entries processed per loop

/**
 * Ingests a Spotify Extended Streaming History export. The catalog is built
 * entirely from the metadata embedded in the export (track/artist/album names) —
 * NO Spotify API calls, because dev-mode apps get 403/429 on the /tracks
 * endpoints. Each chunk upserts its catalog then bulk-inserts deduped plays
 * tagged IMPORT_EXTENDED. When done it rebuilds the user's rollups, achievements
 * and eras so years of history light up the whole dashboard at once.
 *
 * Runs with concurrency 1 — keeps a single user's import from competing with
 * itself for DB connections.
 */
@Processor(IMPORT_QUEUE, { concurrency: 1 })
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly aggregation: AggregationService,
    private readonly achievements: AchievementsService,
    private readonly eras: ErasService,
    private readonly events: MusicEventsService,
  ) {
    super();
  }

  async process(job: Job<ExtendedImportJobData>): Promise<unknown> {
    const { userId, entries } = job.data;
    if (entries.length === 0) return { imported: 0, total: 0 };

    let imported = 0;

    for (let i = 0; i < entries.length; i += DB_CHUNK) {
      const chunk = entries.slice(i, i + DB_CHUNK);
      const resolved = await this.catalog.upsertTracksFromHistory(chunk);

      const rows: Prisma.ListeningHistoryCreateManyInput[] = [];
      for (const e of chunk) {
        const sid = e.trackUri.slice(TRACK_URI_PREFIX.length);
        const hit = resolved.get(sid);
        if (!hit) continue; // unresolvable (missing metadata)
        rows.push({
          userId,
          trackId: hit.trackId,
          artistId: hit.artistId,
          playedAt: new Date(e.ts),
          msPlayed: e.msPlayed,
          source: PlaySource.IMPORT_EXTENDED,
          skipped: e.skipped,
        });
      }

      if (rows.length > 0) {
        const { count } = await this.prisma.listeningHistory.createMany({
          data: rows,
          skipDuplicates: true,
        });
        imported += count;
      }
      await job.updateProgress(Math.round(((i + chunk.length) / entries.length) * 100));
    }

    // Rebuild everything derived now that history changed.
    await this.aggregation.recomputeAllDays(userId);
    await this.achievements.evaluate(userId).catch((e) => this.warn('achievements', userId, e));
    await this.eras.rebuild(userId).catch((e) => this.warn('eras', userId, e));
    await this.events.generate(userId).catch((e) => this.warn('events', userId, e));
    await this.prisma.user.update({ where: { id: userId }, data: { lastSyncedAt: new Date() } });

    this.logger.log(`Import for ${userId}: ${imported}/${entries.length} plays stored`);
    return { imported, total: entries.length };
  }

  private warn(stage: string, userId: string, e: unknown) {
    this.logger.warn(`${stage} failed for ${userId}: ${e instanceof Error ? e.message : e}`);
  }
}
