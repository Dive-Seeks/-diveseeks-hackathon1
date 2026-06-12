import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsIn(['system', 'billing', 'security', 'product'])
  type?: 'system' | 'billing' | 'security' | 'product';

  @IsOptional()
  @IsIn(['in_app', 'email', 'push'])
  channel?: 'in_app' | 'email' | 'push';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  actionUrl?: string;
}
