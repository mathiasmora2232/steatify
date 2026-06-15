import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SpotifyModule } from '../spotify/spotify.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StatsModule } from '../stats/stats.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ErasModule } from '../eras/eras.module';
import { MusicEventsModule } from '../events/music-events.module';
import { IMPORT_QUEUE } from './import.constants';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportProcessor } from './import.processor';

@Module({
  imports: [
    SpotifyModule,
    CatalogModule,
    StatsModule,
    AchievementsModule,
    ErasModule,
    MusicEventsModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportProcessor],
})
export class ImportModule {}
