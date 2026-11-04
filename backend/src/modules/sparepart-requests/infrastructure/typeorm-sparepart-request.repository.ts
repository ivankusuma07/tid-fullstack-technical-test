import { EntityManager, Repository } from 'typeorm';
import { NewSparepartRequest, SparepartRequest } from '../domain/sparepart-request';
import { SparepartRequestRepository } from '../domain/sparepart-request.repository';
import { SparepartRequestStatus } from '../domain/sparepart-request-status.enum';
import { SparepartRequestMapper } from './sparepart-request.mapper';
import { SparepartRequestOrmEntity } from './sparepart-request.orm-entity';

export class TypeOrmSparepartRequestRepository implements SparepartRequestRepository {
  private readonly repo: Repository<SparepartRequestOrmEntity>;

  constructor(manager: EntityManager) {
    this.repo = manager.getRepository(SparepartRequestOrmEntity);
  }

  async create(data: NewSparepartRequest): Promise<SparepartRequest> {
    // Items are cascaded on insert, so request + items are written together.
    const row = await this.repo.save(
      this.repo.create({
        workOrderId: data.workOrderId,
        requestNote: data.requestNote,
        requestedById: data.requestedById,
        status: SparepartRequestStatus.PENDING,
        items: data.items.map((i) => ({ name: i.name, qty: i.qty })),
      }),
    );
    return SparepartRequestMapper.toDomain(row);
  }

  async findById(id: string, options: { lock?: boolean } = {}): Promise<SparepartRequest | null> {
    const qb = this.repo.createQueryBuilder('r').where('r.id = :id', { id });
    if (options.lock) qb.setLock('pessimistic_write');
    const row = await qb.getOne();
    return row ? SparepartRequestMapper.toDomain(row) : null;
  }

  async findPendingByWorkOrder(workOrderId: string): Promise<SparepartRequest | null> {
    const row = await this.repo.findOne({
      where: { workOrderId, status: SparepartRequestStatus.PENDING },
      relations: { items: true },
    });
    return row ? SparepartRequestMapper.toDomain(row) : null;
  }

  async save(request: SparepartRequest): Promise<SparepartRequest> {
    await this.repo.update(
      { id: request.id },
      { status: request.status, approvedById: request.approvedById, approvalNote: request.approvalNote },
    );
    return (await this.findById(request.id))!;
  }
}
