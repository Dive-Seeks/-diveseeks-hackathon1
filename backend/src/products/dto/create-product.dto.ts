import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsUrl,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
