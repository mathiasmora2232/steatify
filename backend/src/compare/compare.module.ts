import { Module } from '@nestjs/common';
import { WrappedModule } from '../wrapped/wrapped.module';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';

@Module({
  imports: [WrappedModule],
  controllers: [CompareController],
  providers: [CompareService],
})
export class CompareModule {}
