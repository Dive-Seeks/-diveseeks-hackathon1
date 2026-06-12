import { Injectable } from '@nestjs/common';
import { CreateExternalIntegrationDto } from './dto/create-external-integration.dto';
import { UpdateExternalIntegrationDto } from './dto/update-external-integration.dto';

@Injectable()
export class ExternalIntegrationsService {
  create(createExternalIntegrationDto: CreateExternalIntegrationDto) {
    return 'This action adds a new externalIntegration';
  }

  findAll() {
    return `This action returns all externalIntegrations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} externalIntegration`;
  }

  update(
    id: number,
    updateExternalIntegrationDto: UpdateExternalIntegrationDto,
  ) {
    return `This action updates a #${id} externalIntegration`;
  }

  remove(id: number) {
    return `This action removes a #${id} externalIntegration`;
  }
}
