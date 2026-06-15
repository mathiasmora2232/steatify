import { Module } from '@nestjs/common';
import { MlModule } from '../ml/ml.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [MlModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
