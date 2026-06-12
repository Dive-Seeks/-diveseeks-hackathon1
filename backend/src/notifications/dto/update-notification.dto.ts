import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  billingAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  productUpdatesEnabled?: boolean;
}
