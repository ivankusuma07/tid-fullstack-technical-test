import { Brackets, EntityManager, Repository } from 'typeorm';
import { NewWorkOrder, WorkOrder, WorkOrderDetail, WorkOrderView } from '../domain/work-order';
import { Page, WorkOrderListCriteria, WorkOrderRepository } from '../domain/work-order.repository';
import { WorkOrderMapper } from './work-order.mapper';
import { WorkOrderOrmEntity } from './work-order.orm-entity';

/**
 * Built from an EntityManager (not injected directly) so the same class works both
 * with the default connection and inside a transaction (see TypeOrmUnitOfWork).
 */
export class TypeOrmWorkOrderRepository implements WorkOrderRepository {
  private readonly repo: Repository<WorkOrderOrmEntity>;

  constructor(private readonly manager: EntityManager) {
    this.repo = manager.getRepository(WorkOrderOrmEntity);
  }

  /** WO-YYYYMMDD-0001; the counter comes from a Postgres sequence, so it is safe under concurrency. */
  async nextWoNumber(now: Date): Promise<string> {
    const [{ n }] = await this.manager.query(`SELECT nextval('work_order_number_seq') AS n`);
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `WO-${ymd}-${String(n).padStart(4, '0')}`;
  }

  async create(data: NewWorkOrder): Promise<WorkOrder> {
    const row = await this.repo.save(this.repo.create(data));
    return WorkOrderMapper.toDomain(row);
  }

  async findById(id: string, options: { lock?: boolean } = {}): Promise<WorkOrder | null> {
    const qb = this.repo.createQueryBuilder('wo').where('wo.id = :id', { id });
    if (options.lock) qb.setLock('pessimistic_write');
    const row = await qb.getOne();
    return row ? WorkOrderMapper.toDomain(row) : null;
  }

  async findDetailById(id: string): Promise<WorkOrderDetail | null> {
    const row = await this.repo.findOne({
      where: { id },
      relations: {
        vehicle: true,
        createdBy: true,
        assignedMechanic: true,
        sparepartRequests: { items: true, requestedBy: true, approvedBy: true },
        activities: { actor: true },
      },
      order: {
        sparepartRequests: { createdAt: 'DESC', items: { createdAt: 'ASC' } },
        activities: { createdAt: 'ASC' },
      },
    });
    return row ? WorkOrderMapper.toDetail(row) : null;
  }

  async list(c: WorkOrderListCriteria): Promise<Page<WorkOrderView>> {
    const qb = this.repo
      .createQueryBuilder('wo')
      .innerJoinAndSelect('wo.vehicle', 'vehicle')
      .leftJoinAndSelect('wo.createdBy', 'creator')
      .leftJoinAndSelect('wo.assignedMechanic', 'mechanic')
      .orderBy('wo.createdAt', 'DESC')
      .skip((c.page - 1) * c.limit)
      .take(c.limit);

    if (c.status) qb.andWhere('wo.status = :status', { status: c.status });
    if (c.assignedMechanicId) qb.andWhere('wo.assignedMechanicId = :mid', { mid: c.assignedMechanicId });
    if (c.excludeStatuses?.length) qb.andWhere('wo.status NOT IN (:...excluded)', { excluded: c.excludeStatuses });
    if (c.search) {
      const term = `%${c.search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('wo.title ILIKE :term', { term })
            .orWhere('wo.woNumber ILIKE :term', { term })
            .orWhere('vehicle.fleetNumber ILIKE :term', { term }),
        ),
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(WorkOrderMapper.toView), total, page: c.page, limit: c.limit };
  }

  async save(wo: WorkOrder): Promise<WorkOrder> {
    await this.repo.update({ id: wo.id }, WorkOrderMapper.toPersistence(wo));
    return (await this.findById(wo.id))!;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
