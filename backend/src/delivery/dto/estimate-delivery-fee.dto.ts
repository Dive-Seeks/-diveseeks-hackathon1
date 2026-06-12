import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class EstimateDeliveryFeeDto {
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
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perKmFee?: number;
}
