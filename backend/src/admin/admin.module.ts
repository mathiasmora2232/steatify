import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SYNC_QUEUE } from '../ingestion/ingestion.constants';
import { IMPORT_QUEUE } from '../import/import.constants';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: SYNC_QUEUE }, { name: IMPORT_QUEUE }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
