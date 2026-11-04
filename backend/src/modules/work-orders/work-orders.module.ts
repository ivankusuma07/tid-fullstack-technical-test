import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CLOCK, SystemClock } from '../../common/application/clock';
import { UsersModule } from '../users/users.module';
import { UNIT_OF_WORK } from './application/unit-of-work';
import { WorkOrdersService } from './application/work-orders.service';
import { WorkOrdersController } from './presentation/work-orders.controller';
import { WORK_ORDER_REPOSITORY } from './domain/work-order.repository';
import { TypeOrmUnitOfWork } from './infrastructure/typeorm-unit-of-work';
import { TypeOrmWorkOrderRepository } from './infrastructure/typeorm-work-order.repository';

@Module({
  imports: [UsersModule],
  controllers: [WorkOrdersController],
  providers: [
    WorkOrdersService,
    { provide: CLOCK, useClass: SystemClock },
    { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
    {
      provide: WORK_ORDER_REPOSITORY,
      useFactory: (ds: DataSource) => new TypeOrmWorkOrderRepository(ds.manager),
      inject: [DataSource],
    },
  ],
  exports: [WorkOrdersService, UNIT_OF_WORK],
})
export class WorkOrdersModule {}
