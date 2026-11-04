import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesService } from './application/vehicles.service';
import { VEHICLE_REPOSITORY } from './domain/vehicle';
import { TypeOrmVehicleRepository } from './infrastructure/typeorm-vehicle.repository';
import { VehicleOrmEntity } from './infrastructure/vehicle.orm-entity';
import { VehiclesController } from './presentation/vehicles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleOrmEntity])],
  controllers: [VehiclesController],
  providers: [VehiclesService, { provide: VEHICLE_REPOSITORY, useClass: TypeOrmVehicleRepository }],
  exports: [VEHICLE_REPOSITORY],
})
export class VehiclesModule {}
