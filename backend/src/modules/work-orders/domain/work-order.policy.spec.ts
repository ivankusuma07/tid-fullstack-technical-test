import { ForbiddenActionError, InvalidTransitionError } from '../../../common/errors/domain.errors';
import { Role } from '../../users/domain/role.enum';
import { Actor } from '../../users/domain/user';
import { assertCan, availableActions, canCreate, canPerform, WorkOrderAction as A } from './work-order.policy';
import { WorkOrderStatus as S } from './work-order-status.enum';

const admin: Actor = { id: 'admin', name: 'Admin', role: Role.ADMIN };
const spv: Actor = { id: 'spv', name: 'SPV', role: Role.SPV };
const mechanic: Actor = { id: 'mech-1', name: 'Mechanic 1', role: Role.MECHANIC };
const otherMechanic: Actor = { id: 'mech-2', name: 'Mechanic 2', role: Role.MECHANIC };

const wo = (status: S, assignedMechanicId: string | null = mechanic.id) => ({ status, assignedMechanicId });

describe('work order policy', () => {
  describe('allowed transitions', () => {
    it.each([
      [A.EDIT, admin, S.DRAFT, S.DRAFT],
      [A.SUBMIT, admin, S.DRAFT, S.SUBMITTED],
      [A.ASSIGN, spv, S.SUBMITTED, S.ASSIGNED],
      [A.ASSIGN, spv, S.ASSIGNED, S.ASSIGNED], // reassign
      [A.UPDATE, admin, S.ASSIGNED, S.UPDATED],
      [A.REQUEST_SPAREPART, mechanic, S.UPDATED, S.WAITING_SPAREPART],
      [A.APPROVE_SPAREPART, spv, S.WAITING_SPAREPART, S.READY_TO_WORK],
      [A.REJECT_SPAREPART, spv, S.WAITING_SPAREPART, S.UPDATED],
      [A.START, mechanic, S.UPDATED, S.WORKING], // no sparepart needed
      [A.START, mechanic, S.READY_TO_WORK, S.WORKING],
      [A.COMPLETE, admin, S.WORKING, S.COMPLETED],
    ])('%s by %o from %s -> %s', (action, actor, from, to) => {
      expect(assertCan(action, wo(from), actor)).toBe(to);
    });

    it('DELETE of a draft has no next status (row is removed)', () => {
      expect(assertCan(A.DELETE, wo(S.DRAFT, null), admin)).toBeNull();
    });
  });

  describe('forbidden: wrong role (403)', () => {
    it.each([
      [A.SUBMIT, spv, S.DRAFT],
      [A.ASSIGN, admin, S.SUBMITTED],
      [A.UPDATE, mechanic, S.ASSIGNED],
      [A.APPROVE_SPAREPART, admin, S.WAITING_SPAREPART],
      [A.REQUEST_SPAREPART, admin, S.UPDATED],
      [A.START, admin, S.READY_TO_WORK],
      [A.COMPLETE, mechanic, S.WORKING],
    ])('%s by %o', (action, actor, status) => {
      expect(() => assertCan(action, wo(status), actor)).toThrow(ForbiddenActionError);
    });
  });

  describe('forbidden: not the assigned mechanic (403)', () => {
    it.each([A.START, A.REQUEST_SPAREPART])('%s by another mechanic', (action) => {
      expect(() => assertCan(action, wo(S.UPDATED), otherMechanic)).toThrow(
        /Only the assigned mechanic/,
      );
    });
  });

  describe('invalid transition: wrong status (409)', () => {
    it.each([
      [A.SUBMIT, admin, S.SUBMITTED],
      [A.ASSIGN, spv, S.UPDATED],
      [A.UPDATE, admin, S.SUBMITTED],
      [A.START, mechanic, S.WAITING_SPAREPART],
      [A.START, mechanic, S.ASSIGNED],
      [A.COMPLETE, admin, S.READY_TO_WORK],
      [A.APPROVE_SPAREPART, spv, S.UPDATED],
      [A.EDIT, admin, S.SUBMITTED],
      [A.DELETE, admin, S.ASSIGNED],
      [A.DELETE, admin, S.COMPLETED],
    ])('%s by %o in %s', (action, actor, status) => {
      expect(() => assertCan(action, wo(status), actor)).toThrow(InvalidTransitionError);
    });

    it('explains the current status in the message', () => {
      expect(() => assertCan(A.START, wo(S.WAITING_SPAREPART), mechanic)).toThrow(
        'Cannot start: status is WAITING_SPAREPART',
      );
    });
  });

  describe('availableActions', () => {
    it('Admin on a draft can edit, delete and submit', () => {
      expect(availableActions(wo(S.DRAFT, null), admin)).toEqual([A.EDIT, A.DELETE, A.SUBMIT]);
    });

    it('assigned mechanic at UPDATED decides: request sparepart or start', () => {
      expect(availableActions(wo(S.UPDATED), mechanic)).toEqual([A.REQUEST_SPAREPART, A.START]);
    });

    it('another mechanic gets nothing on the same work order', () => {
      expect(availableActions(wo(S.UPDATED), otherMechanic)).toEqual([]);
    });

    it('SPV reviewing a request can approve or reject', () => {
      expect(availableActions(wo(S.WAITING_SPAREPART), spv)).toEqual([
        A.APPROVE_SPAREPART,
        A.REJECT_SPAREPART,
      ]);
    });

    it('nobody can act on a completed work order', () => {
      for (const actor of [admin, spv, mechanic]) {
        expect(availableActions(wo(S.COMPLETED), actor)).toEqual([]);
      }
    });
  });

  it('only Admin can create', () => {
    expect(canCreate(admin)).toBe(true);
    expect(canCreate(spv)).toBe(false);
    expect(canCreate(mechanic)).toBe(false);
  });

  it('canPerform mirrors assertCan without throwing', () => {
    expect(canPerform(A.SUBMIT, wo(S.DRAFT), admin)).toBe(true);
    expect(canPerform(A.SUBMIT, wo(S.DRAFT), spv)).toBe(false);
  });
});
