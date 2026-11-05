import {
  ForbiddenActionError,
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain.errors';
import {
  FixedClock,
  InMemoryActivityRepository,
  InMemorySparepartRequestRepository,
  InMemoryUnitOfWork,
  InMemoryUserRepository,
  InMemoryVehicleRepository,
  InMemoryWorkOrderRepository,
} from '../../../testing/in-memory-repositories';
import { SparepartRequestsService } from '../../sparepart-requests/application/sparepart-requests.service';
import { SparepartRequestStatus } from '../../sparepart-requests/domain/sparepart-request-status.enum';
import { Role } from '../../users/domain/role.enum';
import { Actor, User } from '../../users/domain/user';
import { WorkOrderAction as A } from '../domain/work-order.policy';
import { WorkOrderStatus as S } from '../domain/work-order-status.enum';
import { WorkOrdersService } from './work-orders.service';

const user = (id: string, role: Role): User => ({
  id,
  name: id,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const admin: Actor = { id: 'admin', name: 'admin', role: Role.ADMIN };
const spv: Actor = { id: 'spv', name: 'spv', role: Role.SPV };
const budi: Actor = { id: 'budi', name: 'budi', role: Role.MECHANIC };
const rudi: Actor = { id: 'rudi', name: 'rudi', role: Role.MECHANIC };

const HOUR = 3_600_000;

const DT35 = { id: 'v-35', fleetNumber: 'DT-0035', name: 'Dump Truck' };
const DT39 = { id: 'v-39', fleetNumber: 'DT-0039', name: 'Dump Truck' };

function setup() {
  const users = new InMemoryUserRepository([admin, spv, budi, rudi].map((a) => user(a.id, a.role)));
  const requests = new InMemorySparepartRequestRepository();
  const activities = new InMemoryActivityRepository();
  const vehicles = new InMemoryVehicleRepository([DT35, DT39]);
  const workOrders = new InMemoryWorkOrderRepository(users, requests, activities, vehicles);
  const clock = new FixedClock(new Date('2026-11-04T08:00:00.000Z'));
  const uow = new InMemoryUnitOfWork({ workOrders, sparepartRequests: requests, activities });
  const service = new WorkOrdersService(workOrders, uow, users, vehicles, clock);
  const spareparts = new SparepartRequestsService(uow, service);

  const createWo = (title = 'Engine overheating') =>
    service.create(admin, {
      title,
      vehicleId: DT35.id,
      breakdownTime: new Date(clock.now().getTime() - HOUR),
    });

  /** Runs the flow up to the mechanic's decision point (UPDATED). */
  const toUpdated = async () => {
    const wo = await createWo();
    await service.submit(admin, wo.id);
    await service.assign(spv, wo.id, budi.id);
    await service.update(admin, wo.id, { description: 'Check the radiator' });
    return wo.id;
  };

  return { service, spareparts, clock, requests, createWo, toUpdated };
}

describe('WorkOrdersService', () => {
  describe('create', () => {
    it('creates a DRAFT with a WO number and its vehicle', async () => {
      const { createWo } = setup();
      const wo = await createWo();
      expect(wo.status).toBe(S.DRAFT);
      expect(wo.woNumber).toBe('WO-20261104-0001');
      expect(wo.vehicle).toEqual(DT35);
      expect(wo.createdBy.id).toBe(admin.id);
      expect(wo.availableActions).toEqual([A.EDIT, A.DELETE, A.SUBMIT]);
    });

    it('rejects a breakdown time in the future', async () => {
      const { service, clock } = setup();
      await expect(
        service.create(admin, {
          title: 'x',
          vehicleId: DT35.id,
          breakdownTime: new Date(clock.now().getTime() + HOUR),
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects an unknown vehicle', async () => {
      const { service, clock } = setup();
      await expect(
        service.create(admin, { title: 'x', vehicleId: 'no-such-vehicle', breakdownTime: clock.now() }),
      ).rejects.toThrow('Vehicle no-such-vehicle does not exist');
    });

    it('only Admin can create', async () => {
      const { service, clock } = setup();
      await expect(
        service.create(spv, { title: 'x', vehicleId: DT35.id, breakdownTime: clock.now() }),
      ).rejects.toThrow(ForbiddenActionError);
    });
  });

  describe('draft edit / delete', () => {
    it('edits and deletes while DRAFT', async () => {
      const { service, createWo } = setup();
      const wo = await createWo();
      const edited = await service.editDraft(admin, wo.id, { title: 'Brake noise', vehicleId: DT39.id });
      expect(edited.title).toBe('Brake noise');
      expect(edited.vehicle.fleetNumber).toBe('DT-0039');

      await service.deleteDraft(admin, wo.id);
      await expect(service.getById(admin, wo.id)).rejects.toThrow(NotFoundError);
    });

    it('cannot edit or delete after submit', async () => {
      const { service, createWo } = setup();
      const wo = await createWo();
      await service.submit(admin, wo.id);
      await expect(service.editDraft(admin, wo.id, { title: 'x' })).rejects.toThrow(InvalidTransitionError);
      await expect(service.deleteDraft(admin, wo.id)).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe('happy paths', () => {
    it('no sparepart: UPDATED -> WORKING -> COMPLETED', async () => {
      const { service, clock, toUpdated } = setup();
      const id = await toUpdated();

      const working = await service.start(budi, id);
      expect(working.status).toBe(S.WORKING);
      expect(working.startDate).toEqual(clock.now());

      clock.advance(2 * HOUR);
      const done = await service.complete(admin, id, clock.now());
      expect(done.status).toBe(S.COMPLETED);
      expect(done.endDate).toEqual(clock.now());
      expect(done.availableActions).toEqual([]);
    });

    it('sparepart approved: WAITING_SPAREPART -> READY_TO_WORK -> WORKING', async () => {
      const { service, spareparts, toUpdated } = setup();
      const id = await toUpdated();

      const waiting = await spareparts.requestSparepart(budi, id, {
        note: 'Radiator hose cracked',
        items: [{ name: 'Radiator hose', qty: 1 }],
      });
      expect(waiting.status).toBe(S.WAITING_SPAREPART);
      const [request] = waiting.sparepartRequests;
      expect(request.status).toBe(SparepartRequestStatus.PENDING);
      expect(request.items).toHaveLength(1);

      const ready = await spareparts.approve(spv, request.id, 'OK');
      expect(ready.status).toBe(S.READY_TO_WORK);
      expect(ready.sparepartRequests[0]).toMatchObject({ status: 'APPROVED', approvedById: spv.id });

      expect((await service.start(budi, id)).status).toBe(S.WORKING);
    });

    it('rejected -> revised -> approved keeps the request history', async () => {
      const { spareparts, toUpdated } = setup();
      const id = await toUpdated();

      const first = await spareparts.requestSparepart(budi, id, {
        note: 'Replace whole engine',
        items: [{ name: 'Engine', qty: 1 }],
      });
      const rejected = await spareparts.reject(spv, first.sparepartRequests[0].id, 'Too much, check the hose');
      expect(rejected.status).toBe(S.UPDATED);

      const second = await spareparts.requestSparepart(budi, id, {
        note: 'Hose only',
        items: [{ name: 'Radiator hose', qty: 1 }],
      });
      const approved = await spareparts.approve(spv, second.sparepartRequests[0].id);
      expect(approved.status).toBe(S.READY_TO_WORK);
      expect(approved.sparepartRequests.map((r) => r.status)).toEqual(['APPROVED', 'REJECTED']);
    });
  });

  describe('activity timeline', () => {
    it('records every step in order with status changes and notes', async () => {
      const { service, spareparts, toUpdated } = setup();
      const id = await toUpdated();
      const waiting = await spareparts.requestSparepart(budi, id, { note: 'Hose cracked', items: [{ name: 'Hose', qty: 1 }] });
      await spareparts.reject(spv, waiting.sparepartRequests[0].id, 'Check the clamp first');
      const wo = await service.start(budi, id);

      expect(wo.activities.map((a) => [a.action, a.fromStatus, a.toStatus, a.actor.id])).toEqual([
        ['CREATE', null, S.DRAFT, admin.id],
        [A.SUBMIT, S.DRAFT, S.SUBMITTED, admin.id],
        [A.ASSIGN, S.SUBMITTED, S.ASSIGNED, spv.id],
        [A.UPDATE, S.ASSIGNED, S.UPDATED, admin.id],
        [A.REQUEST_SPAREPART, S.UPDATED, S.WAITING_SPAREPART, budi.id],
        [A.REJECT_SPAREPART, S.WAITING_SPAREPART, S.UPDATED, spv.id],
        [A.START, S.UPDATED, S.WORKING, budi.id],
      ]);
      expect(wo.activities.find((a) => a.action === A.ASSIGN)!.note).toBe('Assigned to budi');
      expect(wo.activities.find((a) => a.action === A.REJECT_SPAREPART)!.note).toBe('Check the clamp first');
    });

    it('a rejected step leaves no timeline entry', async () => {
      const { service, toUpdated } = setup();
      const id = await toUpdated();
      await expect(service.start(rudi, id)).rejects.toThrow(ForbiddenActionError);
      const wo = await service.getById(admin, id);
      expect(wo.activities.map((a) => a.action)).not.toContain(A.START);
    });
  });

  describe('rules', () => {
    it('only the assigned mechanic can start', async () => {
      const { service, toUpdated } = setup();
      const id = await toUpdated();
      await expect(service.start(rudi, id)).rejects.toThrow(ForbiddenActionError);
    });

    it('cannot start while waiting for spareparts', async () => {
      const { service, spareparts, toUpdated } = setup();
      const id = await toUpdated();
      await spareparts.requestSparepart(budi, id, { note: 'n', items: [{ name: 'Filter', qty: 2 }] });
      await expect(service.start(budi, id)).rejects.toThrow('Cannot start: status is WAITING_SPAREPART');
    });

    it('assign target must be a mechanic', async () => {
      const { service, createWo } = setup();
      const wo = await createWo();
      await service.submit(admin, wo.id);
      await expect(service.assign(spv, wo.id, admin.id)).rejects.toThrow(ValidationError);
    });

    it('reject requires a note, request requires a note and items', async () => {
      const { spareparts, toUpdated } = setup();
      const id = await toUpdated();
      await expect(spareparts.requestSparepart(budi, id, { note: ' ', items: [{ name: 'x', qty: 1 }] })).rejects.toThrow(
        ValidationError,
      );
      await expect(spareparts.requestSparepart(budi, id, { note: 'n', items: [] })).rejects.toThrow(ValidationError);

      const wo = await spareparts.requestSparepart(budi, id, { note: 'n', items: [{ name: 'x', qty: 1 }] });
      await expect(spareparts.reject(spv, wo.sparepartRequests[0].id, '')).rejects.toThrow(ValidationError);
    });

    it('cannot approve the same request twice', async () => {
      const { spareparts, toUpdated } = setup();
      const id = await toUpdated();
      const wo = await spareparts.requestSparepart(budi, id, { note: 'n', items: [{ name: 'x', qty: 1 }] });
      await spareparts.approve(spv, wo.sparepartRequests[0].id);
      await expect(spareparts.approve(spv, wo.sparepartRequests[0].id)).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe('end date', () => {
    const toWorking = async (ctx: ReturnType<typeof setup>) => {
      const id = await ctx.toUpdated();
      await ctx.service.start(budi, id);
      return id;
    };

    it('must not be before the start date', async () => {
      const ctx = setup();
      const id = await toWorking(ctx);
      await expect(
        ctx.service.complete(admin, id, new Date(ctx.clock.now().getTime() - HOUR)),
      ).rejects.toThrow('End date cannot be before the start date');
    });

    it('must not be in the future', async () => {
      const ctx = setup();
      const id = await toWorking(ctx);
      await expect(
        ctx.service.complete(admin, id, new Date(ctx.clock.now().getTime() + HOUR)),
      ).rejects.toThrow('End date cannot be in the future');
    });
  });

  describe('list scoping', () => {
    it('mechanic only sees work orders assigned to them', async () => {
      const { service, createWo, toUpdated } = setup();
      await createWo('Still a draft');
      const mineId = await toUpdated();

      const unassigned = await createWo('Submitted, not assigned yet');
      await service.submit(admin, unassigned.id);

      const other = await createWo('Rudi job');
      await service.submit(admin, other.id);
      await service.assign(spv, other.id, rudi.id);

      expect((await service.list(budi)).items.map((w) => w.id)).toEqual([mineId]);
      expect((await service.list(rudi)).items.map((w) => w.id)).toEqual([other.id]);
    });

    it('Admin and SPV always see everything', async () => {
      const { service, createWo, toUpdated } = setup();
      await createWo('Draft');
      await toUpdated();
      expect((await service.list(admin)).total).toBe(2);
      expect((await service.list(spv)).total).toBe(2);
    });

    it('mechanic cannot open a work order that is not assigned to them', async () => {
      const { service, createWo, toUpdated } = setup();
      const draft = await createWo();
      await expect(service.getById(budi, draft.id)).rejects.toThrow(NotFoundError);

      const mineId = await toUpdated();
      await expect(service.getById(budi, mineId)).resolves.toMatchObject({ id: mineId });
      await expect(service.getById(rudi, mineId)).rejects.toThrow(NotFoundError);
    });

    it('a reassigned work order disappears from the previous mechanic', async () => {
      const { service, createWo } = setup();
      const { id } = await createWo();
      await service.submit(admin, id);
      await service.assign(spv, id, budi.id);
      expect((await service.list(budi)).total).toBe(1);
      await service.assign(spv, id, rudi.id);
      expect((await service.list(budi)).total).toBe(0);
      await expect(service.getById(budi, id)).rejects.toThrow(NotFoundError);
      await expect(service.getById(rudi, id)).resolves.toMatchObject({ id });
    });

    it('search matches title, WO number and fleet number', async () => {
      const { service, createWo } = setup();
      await createWo('Brake noise');
      await createWo('Flat tyre');
      expect((await service.list(admin, { search: 'brake' })).total).toBe(1);
      expect((await service.list(admin, { search: '0002' })).total).toBe(1);
      expect((await service.list(admin, { search: 'dt-0035' })).total).toBe(2);
    });
  });
});
