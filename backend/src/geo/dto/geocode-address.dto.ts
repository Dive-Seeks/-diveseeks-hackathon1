import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class GeocodeAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(300)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  tenantId: string;
}
