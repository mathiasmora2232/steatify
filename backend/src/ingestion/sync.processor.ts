import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SYNC_QUEUE, SyncJob, RecentPlaysJobData } from './ingestion.constants';
import { IngestionService } from './ingestion.service';

/**
 * BullMQ worker. Concurrency is capped so we respect Spotify's rate limits
 * across the whole user base rather than hammering the API in parallel.
 */
@Processor(SYNC_QUEUE, { concurrency: 5 })
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly ingestion: IngestionService) {
    super();
  }

  async process(job: Job<RecentPlaysJobData>): Promise<unknown> {
    if (job.name !== SyncJob.RECENT_PLAYS) return;
    try {
      return await this.ingestion.syncRecentPlays(job.data.userId);
    } catch (err) {
      this.logger.error(
        `Sync job ${job.id} for user ${job.data.userId} failed: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw err; // let BullMQ apply backoff/retry
    }
  }
}
