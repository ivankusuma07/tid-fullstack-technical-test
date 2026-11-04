import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CLOCK, SystemClock } from '../../common/application/clock';
import { UsersModule } from '../users/users.module';
import { WorkOrdersService } from './application/work-orders.service';
import { WORK_ORDER_REPOSITORY } from './domain/work-order.repository';
import { TypeOrmWorkOrderRepository } from './infrastructure/typeorm-work-order.repository';

@Module({
  imports: [UsersModule],
  providers: [
    WorkOrdersService,
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: WORK_ORDER_REPOSITORY,
      useFactory: (ds: DataSource) => new TypeOrmWorkOrderRepository(ds.manager),
      inject: [DataSource],
    },
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
