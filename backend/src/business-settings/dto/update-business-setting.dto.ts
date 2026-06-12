import { PartialType } from '@nestjs/swagger';
import { CreateBusinessSettingDto } from './create-business-setting.dto';

export class UpdateBusinessSettingDto extends PartialType(
  CreateBusinessSettingDto,
) {}
