import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @IsUUID() parentId?: string;
}
