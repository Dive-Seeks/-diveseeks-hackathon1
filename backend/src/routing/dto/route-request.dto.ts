import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RouteMode } from '../interfaces/routing-provider.interface';

export class RouteRequestDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLongitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLongitude: number;

  @IsOptional()
  @IsString()
  @IsIn(['driving', 'walking', 'bicycling'])
  mode?: RouteMode;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
