import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { SparepartRequestsService } from './application/sparepart-requests.service';
import { UNIT_OF_WORK } from './application/unit-of-work';
import { TypeOrmUnitOfWork } from './infrastructure/typeorm-unit-of-work';
import { SparepartRequestsController } from './presentation/sparepart-requests.controller';

@Module({
  imports: [WorkOrdersModule],
  controllers: [SparepartRequestsController],
  providers: [SparepartRequestsService, { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork }],
})
export class SparepartRequestsModule {}
