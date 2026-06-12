import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CheckDeliveryAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
