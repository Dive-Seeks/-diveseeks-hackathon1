import { Injectable } from '@nestjs/common';
import { CreateBusinessConfigurationDto } from './dto/create-business-configuration.dto';
import { UpdateBusinessConfigurationDto } from './dto/update-business-configuration.dto';

@Injectable()
export class BusinessConfigurationsService {
  create(_createBusinessConfigurationDto: CreateBusinessConfigurationDto) {
    return 'This action adds a new businessConfiguration';
  }

  findAll() {
    return `This action returns all businessConfigurations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} businessConfiguration`;
  }

  update(
    id: number,
    _updateBusinessConfigurationDto: UpdateBusinessConfigurationDto,
  ) {
    return `This action updates a #${id} businessConfiguration`;
  }

  remove(id: number) {
    return `This action removes a #${id} businessConfiguration`;
  }
}
