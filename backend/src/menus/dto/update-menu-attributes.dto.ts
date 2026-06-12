import { IsObject, IsOptional } from 'class-validator';

export class UpdateMenuAttributesDto {
  @IsObject()
  @IsOptional()
  globalAttributes: Record<string, any>;
}

export class UpdateItemAttributesDto {
  @IsObject()
  @IsOptional()
  itemAttributes: Record<string, any>;
}
