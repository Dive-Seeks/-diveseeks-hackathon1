import { PartialType } from '@nestjs/swagger';
import { CreateExternalIntegrationDto } from './create-external-integration.dto';

export class UpdateExternalIntegrationDto extends PartialType(
  CreateExternalIntegrationDto,
) {}
