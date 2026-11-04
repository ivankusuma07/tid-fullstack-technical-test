import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { SparepartRequestsService } from './application/sparepart-requests.service';
import { SparepartRequestsController } from './presentation/sparepart-requests.controller';

@Module({
  // WorkOrdersModule provides WorkOrdersService and the UNIT_OF_WORK.
  imports: [WorkOrdersModule],
  controllers: [SparepartRequestsController],
  providers: [SparepartRequestsService],
})
export class SparepartRequestsModule {}
