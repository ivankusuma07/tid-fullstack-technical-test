import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { IsIsoDateTime } from '../../../common/validation/is-iso-date-time';
import { ListScope } from '../application/work-order.inputs';
import { WorkOrderStatus } from '../domain/work-order-status.enum';

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'Engine overheating' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Coolant temperature warning on the haul road.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'a0000000-0000-4000-8000-000000000035', description: 'Vehicle id from GET /api/vehicles' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ example: '2026-11-04T05:00:00.000Z', description: 'ISO 8601 with offset; must not be in the future' })
  @IsIsoDateTime()
  breakdownTime: string;
}

export class EditDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Vehicle id from GET /api/vehicles' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '2026-11-04T05:00:00.000Z' })
  @IsOptional()
  @IsIsoDateTime()
  breakdownTime?: string;
}

/** "Update (lanjutan)": the Admin's follow-up after a mechanic is assigned. */
export class UpdateWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Mechanic to check radiator and hoses.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class AssignMechanicDto {
  @ApiProperty({ example: '33333333-3333-4333-8333-333333333333' })
  @IsUUID()
  mechanicId: string;
}

export class CompleteWorkOrderDto {
  @ApiProperty({ example: '2026-11-04T13:00:00.000Z', description: 'ISO 8601 with offset; >= start date, not in the future' })
  @IsIsoDateTime()
  endDate: string;
}

export class ListWorkOrdersQueryDto {
  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: ['all', 'mine'], description: 'Mechanics only; defaults to "mine" for mechanics' })
  @IsOptional()
  @IsIn(['all', 'mine'])
  scope?: ListScope;

  @ApiPropertyOptional({ description: 'Matches title, WO number or fleet number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
