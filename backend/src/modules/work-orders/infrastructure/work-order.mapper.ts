import { SparepartRequestMapper } from '../../sparepart-requests/infrastructure/sparepart-request.mapper';
import { toUserSummary } from '../../users/infrastructure/user.mapper';
import { toVehicle } from '../../vehicles/infrastructure/typeorm-vehicle.repository';
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
      vehicleId: row.vehicleId,
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

  /** Requires the vehicle / createdBy / assignedMechanic relations to be loaded. */
  toView(row: WorkOrderOrmEntity): WorkOrderView {
    return {
      ...WorkOrderMapper.toDomain(row),
      vehicle: toVehicle(row.vehicle!),
      createdBy: toUserSummary(row.createdBy!),
      assignedMechanic: row.assignedMechanic ? toUserSummary(row.assignedMechanic) : null,
    };
  },

  toDetail(row: WorkOrderOrmEntity): WorkOrderDetail {
    return {
      ...WorkOrderMapper.toView(row),
      sparepartRequests: (row.sparepartRequests ?? []).map(SparepartRequestMapper.toView),
      activities: (row.activities ?? []).map((a) => ({
        id: a.id,
        workOrderId: a.workOrderId,
        actorId: a.actorId,
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        note: a.note,
        sparepartRequestId: a.sparepartRequestId,
        createdAt: a.createdAt,
        actor: toUserSummary(a.actor!),
      })),
    };
  },

  /** Only the fields that use cases are allowed to change. */
  toPersistence(wo: WorkOrder): Partial<WorkOrderOrmEntity> {
    return {
      title: wo.title,
      description: wo.description,
      vehicleId: wo.vehicleId,
      breakdownTime: wo.breakdownTime,
      status: wo.status,
      assignedMechanicId: wo.assignedMechanicId,
      startDate: wo.startDate,
      endDate: wo.endDate,
    };
  },
};
