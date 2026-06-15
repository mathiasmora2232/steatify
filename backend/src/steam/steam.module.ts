import { Module } from '@nestjs/common';
import { SteamController } from './steam.controller';
import { SteamService } from './steam.service';
import { SteamApiService } from './steam-api.service';
import { SteamScheduler } from './steam.scheduler';
import { MusicEventsModule } from '../events/music-events.module';
import { MlModule } from '../ml/ml.module';

@Module({
  imports: [MusicEventsModule, MlModule],
  controllers: [SteamController],
  providers: [SteamService, SteamApiService, SteamScheduler],
  exports: [SteamService],
})
export class SteamModule {}
