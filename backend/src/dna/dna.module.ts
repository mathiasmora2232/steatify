import { Module } from '@nestjs/common';
import { DnaController } from './dna.controller';
import { DnaService } from './dna.service';

@Module({
  controllers: [DnaController],
  providers: [DnaService],
  exports: [DnaService],
})
export class DnaModule {}
