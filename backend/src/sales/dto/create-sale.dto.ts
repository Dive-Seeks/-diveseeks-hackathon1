import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsObject,
  IsUUID,
} from 'class-validator';

export class CreateSaleDto {
  @IsUUID()
  @IsNotEmpty()
  businessId: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsNumber()
  @IsNotEmpty()
  total: number;

  @IsArray()
  @IsNotEmpty()
  items: any[];

  @IsObject()
  @IsOptional()
  customer?: { name: string; email: string; avatar?: string };

  @IsString()
  @IsOptional()
  status?: string;
}
