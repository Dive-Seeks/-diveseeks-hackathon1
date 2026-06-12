import { PartialType } from '@nestjs/swagger';
import { CreateBusinessConfigurationDto } from './create-business-configuration.dto';

export class UpdateBusinessConfigurationDto extends PartialType(
  CreateBusinessConfigurationDto,
) {}
