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

/** Fleet master data. Fixed ids for the same reason as the users. */
export const SEED_VEHICLES = [
  { id: 'a0000000-0000-4000-8000-000000000011', fleetNumber: 'DT-0011', name: 'Dump Truck - Hino 500' },
  { id: 'a0000000-0000-4000-8000-000000000022', fleetNumber: 'DT-0022', name: 'Dump Truck - Hino 500' },
  { id: 'a0000000-0000-4000-8000-000000000033', fleetNumber: 'DT-0033', name: 'Dump Truck - Scania P360' },
  { id: 'a0000000-0000-4000-8000-000000000035', fleetNumber: 'DT-0035', name: 'Dump Truck - Scania P360' },
  { id: 'a0000000-0000-4000-8000-000000000039', fleetNumber: 'DT-0039', name: 'Dump Truck - Volvo FMX' },
  { id: 'a0000000-0000-4000-8000-000000000101', fleetNumber: 'EX-0101', name: 'Excavator - Komatsu PC200' },
  { id: 'a0000000-0000-4000-8000-000000000201', fleetNumber: 'WL-0201', name: 'Wheel Loader - CAT 950' },
] as const;
