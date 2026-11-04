import { SparepartRequestMapper } from '../../sparepart-requests/infrastructure/sparepart-request.mapper';
import { toUserSummary } from '../../users/infrastructure/user.mapper';
import { WorkOrder, WorkOrderDetail, WorkOrderView } from '../domain/work-order';
import { WorkOrderOrmEntity } from './work-order.orm-entity';

/** ORM row <-> domain model. Keeps TypeORM types out of the application layer. */
export const WorkOrderMapper = {
  toDomain(row: WorkOrderOrmEntity): WorkOrder {
    return {
      id: row.id,
      woNumber: row.woNumber,
      title: row.title,
      description: row.description,
      fleetNumber: row.fleetNumber,
      breakdownTime: row.breakdownTime,
      status: row.status,
      createdById: row.createdById,
      assignedMechanicId: row.assignedMechanicId,
      startDate: row.startDate,
      endDate: row.endDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  /** Requires the createdBy / assignedMechanic relations to be loaded. */
  toView(row: WorkOrderOrmEntity): WorkOrderView {
    return {
      ...WorkOrderMapper.toDomain(row),
      createdBy: toUserSummary(row.createdBy!),
      assignedMechanic: row.assignedMechanic ? toUserSummary(row.assignedMechanic) : null,
    };
  },

  toDetail(row: WorkOrderOrmEntity): WorkOrderDetail {
    return {
      ...WorkOrderMapper.toView(row),
      sparepartRequests: (row.sparepartRequests ?? []).map(SparepartRequestMapper.toView),
    };
  },

  /** Only the fields that use cases are allowed to change. */
  toPersistence(wo: WorkOrder): Partial<WorkOrderOrmEntity> {
    return {
      title: wo.title,
      description: wo.description,
      fleetNumber: wo.fleetNumber,
      breakdownTime: wo.breakdownTime,
      status: wo.status,
      assignedMechanicId: wo.assignedMechanicId,
      startDate: wo.startDate,
      endDate: wo.endDate,
    };
  },
};
