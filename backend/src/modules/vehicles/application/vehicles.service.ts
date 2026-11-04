import { Inject, Injectable } from '@nestjs/common';
import { Vehicle, VEHICLE_REPOSITORY, VehicleRepository } from '../domain/vehicle';

@Injectable()
export class VehiclesService {
  constructor(@Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}

  list(): Promise<Vehicle[]> {
    return this.vehicles.findAll();
  }
}
