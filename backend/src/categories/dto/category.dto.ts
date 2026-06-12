import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
