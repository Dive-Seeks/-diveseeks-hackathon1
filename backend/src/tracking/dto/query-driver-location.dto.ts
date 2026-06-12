import { IsNotEmpty, IsString } from 'class-validator';

export class QueryDriverLocationDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;
}
