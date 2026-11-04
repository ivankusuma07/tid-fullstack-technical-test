import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleRepository } from '../domain/vehicle';
import { VehicleOrmEntity } from './vehicle.orm-entity';

export const toVehicle = (row: VehicleOrmEntity): Vehicle => ({
  id: row.id,
  fleetNumber: row.fleetNumber,
  name: row.name,
});

@Injectable()
export class TypeOrmVehicleRepository implements VehicleRepository {
  constructor(@InjectRepository(VehicleOrmEntity) private readonly repo: Repository<VehicleOrmEntity>) {}

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toVehicle(row) : null;
  }

  async findAll(): Promise<Vehicle[]> {
    return (await this.repo.find({ order: { fleetNumber: 'ASC' } })).map(toVehicle);
  }
}
