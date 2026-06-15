import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SpotifyModule } from '../spotify/spotify.module';
import { StatsModule } from '../stats/stats.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MusicEventsModule } from '../events/music-events.module';
import { SYNC_QUEUE } from './ingestion.constants';
import { IngestionService } from './ingestion.service';
import { SyncProcessor } from './sync.processor';
import { SyncScheduler } from './sync.scheduler';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [
    SpotifyModule,
    StatsModule,
    AchievementsModule,
    CatalogModule,
    MusicEventsModule,
    BullModule.registerQueue({ name: SYNC_QUEUE }),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, SyncProcessor, SyncScheduler],
  exports: [IngestionService, SyncScheduler],
})
export class IngestionModule {}
