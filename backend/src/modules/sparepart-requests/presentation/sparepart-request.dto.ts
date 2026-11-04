import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SparepartItemDto {
  @ApiProperty({ example: 'Radiator hose' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(10000)
  qty: number;
}

export class RequestSparepartDto {
  @ApiProperty({ example: 'Upper radiator hose is cracked and leaking coolant.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note: string;

  @ApiProperty({ type: [SparepartItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SparepartItemDto)
  items: SparepartItemDto[];
}

export class ApproveSparepartDto {
  @ApiPropertyOptional({ example: 'Approved, take it from warehouse A.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RejectSparepartDto {
  @ApiProperty({ example: 'Hose only, the pump is fine.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note: string;
}
