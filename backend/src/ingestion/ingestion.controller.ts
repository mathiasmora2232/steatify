import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { SyncScheduler } from './sync.scheduler';
import { IngestionService } from './ingestion.service';

@UseGuards(JwtAuthGuard)
@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly scheduler: SyncScheduler,
    private readonly ingestion: IngestionService,
  ) {}

  /** Manually trigger a sync for the current user (e.g. a "Sync now" button). */
  @Post('sync')
  async syncNow(@CurrentUser() user: AuthUser) {
    const jobId = await this.scheduler.enqueueUser(user.id, 'manual');
    return { enqueued: true, jobId };
  }

  /** Live "Now Playing" — what the user is currently listening to. */
  @Get('now-playing')
  nowPlaying(@CurrentUser() user: AuthUser) {
    return this.ingestion.nowPlaying(user.id);
  }

  /** Backfill missing track durations (fixes under-counted minutes). */
  @Post('backfill-durations')
  backfillDurations(@CurrentUser() user: AuthUser) {
    return this.ingestion.backfillDurations(user.id);
  }

  /** Re-derive listened minutes (no Spotify calls). */
  @Post('recompute-minutes')
  recomputeMinutes(@CurrentUser() user: AuthUser) {
    return this.ingestion.recomputeMinutes(user.id);
  }
}
