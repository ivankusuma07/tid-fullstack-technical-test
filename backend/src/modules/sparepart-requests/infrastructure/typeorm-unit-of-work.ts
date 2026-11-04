import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmWorkOrderRepository } from '../../work-orders/infrastructure/typeorm-work-order.repository';
import { TransactionalRepositories, UnitOfWork } from '../application/unit-of-work';
import { TypeOrmSparepartRequestRepository } from './typeorm-sparepart-request.repository';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        workOrders: new TypeOrmWorkOrderRepository(manager),
        sparepartRequests: new TypeOrmSparepartRequestRepository(manager),
      }),
    );
  }
}
