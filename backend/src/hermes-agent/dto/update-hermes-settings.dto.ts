import { IsBoolean } from 'class-validator';

export class UpdateHermesSettingsDto {
  @IsBoolean()
  enabled: boolean;
}
