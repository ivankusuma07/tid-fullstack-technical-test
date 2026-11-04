import { EntityManager, Repository } from 'typeorm';
import { NewWorkOrderActivity } from '../domain/work-order-activity';
import { WorkOrderActivityRepository } from '../domain/work-order-activity.repository';
import { WorkOrderActivityOrmEntity } from './work-order-activity.orm-entity';

export class TypeOrmWorkOrderActivityRepository implements WorkOrderActivityRepository {
  private readonly repo: Repository<WorkOrderActivityOrmEntity>;

  constructor(manager: EntityManager) {
    this.repo = manager.getRepository(WorkOrderActivityOrmEntity);
  }

  async record(activity: NewWorkOrderActivity): Promise<void> {
    await this.repo.insert(activity);
  }
}
