import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { AddressType } from '../entities/address.entity';

export class AddressDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  locality: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;
}
