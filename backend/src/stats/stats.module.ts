import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AggregationService } from './aggregation.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, AggregationService],
  exports: [AggregationService], // ingestion triggers a rollup after each sync
})
export class StatsModule {}
