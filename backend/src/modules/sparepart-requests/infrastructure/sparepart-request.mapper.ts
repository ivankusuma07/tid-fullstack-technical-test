import { toUserSummary } from '../../users/infrastructure/user.mapper';
import { SparepartRequest, SparepartRequestView } from '../domain/sparepart-request';
import { SparepartRequestOrmEntity } from './sparepart-request.orm-entity';

export const SparepartRequestMapper = {
  toDomain(row: SparepartRequestOrmEntity): SparepartRequest {
    return {
      id: row.id,
      workOrderId: row.workOrderId,
      status: row.status,
      requestNote: row.requestNote,
      requestedById: row.requestedById,
      approvedById: row.approvedById,
      approvalNote: row.approvalNote,
      items: (row.items ?? []).map((i) => ({ id: i.id, name: i.name, qty: i.qty })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  /** Requires the requestedBy / approvedBy / items relations to be loaded. */
  toView(row: SparepartRequestOrmEntity): SparepartRequestView {
    return {
      ...SparepartRequestMapper.toDomain(row),
      requestedBy: toUserSummary(row.requestedBy!),
      approvedBy: row.approvedBy ? toUserSummary(row.approvedBy) : null,
    };
  },
};
