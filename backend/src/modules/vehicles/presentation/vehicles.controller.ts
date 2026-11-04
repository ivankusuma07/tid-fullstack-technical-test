import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from '../application/vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Fleet master data, for the vehicle picker' })
  list() {
    return this.vehicles.list();
  }
}
