import { Module } from '@nestjs/common';
import { MusicEventsController } from './music-events.controller';
import { MusicEventsService } from './music-events.service';

@Module({
  controllers: [MusicEventsController],
  providers: [MusicEventsService],
  exports: [MusicEventsService],
})
export class MusicEventsModule {}
