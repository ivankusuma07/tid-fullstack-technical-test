/** A unit in the fleet. Work orders reference it instead of storing a free-text fleet number. */
export interface Vehicle {
  id: string;
  /** Unique, upper case, e.g. DT-0035. */
  fleetNumber: string;
  /** Description, e.g. "Dump Truck - Hino 500". */
  name: string;
}

export type VehicleSummary = Vehicle;

export const VEHICLE_REPOSITORY = Symbol('VEHICLE_REPOSITORY');

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
  findAll(): Promise<Vehicle[]>;
}
