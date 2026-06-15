import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SYNC_QUEUE, SyncJob, RecentPlaysJobData } from './ingestion.constants';

/**
 * Fans out per-user sync jobs on a schedule. Because Spotify only returns the
 * last ~24h / 50 plays, frequent polling is how we build a complete history.
 * Every 30 min is a safe cadence for typical listening volume.
 *
 * Jobs are deduped by jobId so overlapping ticks don't double-enqueue a user.
 */
@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    @InjectQueue(SYNC_QUEUE) private readonly queue: Queue<RecentPlaysJobData>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async enqueueAll(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { syncEnabled: true, spotifyAccount: { isNot: null } },
      select: { id: true },
    });
    if (users.length === 0) return;

    // Only sync users who actually used the app recently (active in the last 2h).
    // When nobody's using it, the background sync does nothing — no Spotify calls,
    // no DB writes. A returning user is re-synced immediately on login anyway.
    const activeIds = await this.cache.filterActive(users.map((u) => u.id));
    if (activeIds.length === 0) {
      this.logger.debug('No active users — skipping sync tick');
      return;
    }

    await this.queue.addBulk(
      activeIds.map((id) => ({
        name: SyncJob.RECENT_PLAYS,
        data: { userId: id, reason: 'cron' as const },
        opts: {
          jobId: `recent:${id}:${this.bucket()}`, // collapse duplicates within the window
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      })),
    );
    this.logger.log(`Enqueued ${activeIds.length} sync jobs (${users.length} eligible)`);
  }

  /** Enqueue a single user's sync immediately (manual / post-login). */
  async enqueueUser(userId: string, reason: RecentPlaysJobData['reason']): Promise<string> {
    const job = await this.queue.add(
      SyncJob.RECENT_PLAYS,
      { userId, reason },
      { attempts: 3, backoff: { type: 'exponential', delay: 10_000 }, removeOnComplete: true },
    );
    return String(job.id);
  }

  /** 30-minute time bucket for idempotent job ids, derived without Date.now drift concerns. */
  private bucket(): number {
    return Math.floor(Date.now() / (30 * 60 * 1000));
  }
}
