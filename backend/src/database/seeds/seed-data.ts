import { Role } from '../../modules/users/domain/role.enum';

/**
 * Fixed UUIDs so the README / curl examples can reference users directly.
 * Two mechanics so that "assign" is a real choice and "only the assigned mechanic" can be shown.
 */
export const SEED_USERS = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Andi (Admin)', role: Role.ADMIN },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Siti (SPV)', role: Role.SPV },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Budi (Mechanic)', role: Role.MECHANIC },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Rudi (Mechanic)', role: Role.MECHANIC },
] as const;
