import { Module } from '@nestjs/common';
import { MlModule } from '../ml/ml.module';
import { ErasController } from './eras.controller';
import { ErasService } from './eras.service';

@Module({
  imports: [MlModule],
  controllers: [ErasController],
  providers: [ErasService],
  exports: [ErasService],
})
export class ErasModule {}
