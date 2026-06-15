import { Module } from '@nestjs/common';
import { WrappedModule } from '../wrapped/wrapped.module';
import { DnaModule } from '../dna/dna.module';
import { ChartsModule } from '../charts/charts.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [WrappedModule, DnaModule, ChartsModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
