import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ZoneType } from '../entities/zone.entity';

class CoordinateDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ZoneType)
  zoneType: ZoneType;

  @ValidateIf((dto: CreateZoneDto) => dto.zoneType === ZoneType.RADIUS)
  @IsNumber()
  @Min(1)
  radiusMeters?: number;

  @ValidateIf((dto: CreateZoneDto) => dto.zoneType === ZoneType.RADIUS)
  @ValidateNested()
  @Type(() => CoordinateDto)
  center?: CoordinateDto;

  @ValidateIf((dto: CreateZoneDto) => dto.zoneType === ZoneType.POLYGON)
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  polygonCoordinates?: CoordinateDto[];

  @IsOptional()
  @IsString()
  metadata?: string;
}
