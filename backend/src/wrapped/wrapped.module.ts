import { Module } from '@nestjs/common';
import { DnaModule } from '../dna/dna.module';
import { SteamModule } from '../steam/steam.module';
import { MlModule } from '../ml/ml.module';
import { WrappedController } from './wrapped.controller';
import { WrappedService } from './wrapped.service';

@Module({
  imports: [DnaModule, SteamModule, MlModule],
  controllers: [WrappedController],
  providers: [WrappedService],
  exports: [WrappedService],
})
export class WrappedModule {}
