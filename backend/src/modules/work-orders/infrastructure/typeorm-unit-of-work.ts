import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmSparepartRequestRepository } from '../../sparepart-requests/infrastructure/typeorm-sparepart-request.repository';
import { TransactionalRepositories, UnitOfWork } from '../application/unit-of-work';
import { TypeOrmWorkOrderRepository } from './typeorm-work-order.repository';
import { TypeOrmWorkOrderActivityRepository } from './typeorm-work-order-activity.repository';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        workOrders: new TypeOrmWorkOrderRepository(manager),
        sparepartRequests: new TypeOrmSparepartRequestRepository(manager),
        activities: new TypeOrmWorkOrderActivityRepository(manager),
      }),
    );
  }
}
