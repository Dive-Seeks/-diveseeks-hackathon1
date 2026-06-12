import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BusinessConfigurationsService } from './business-configurations.service';
import { CreateBusinessConfigurationDto } from './dto/create-business-configuration.dto';
import { UpdateBusinessConfigurationDto } from './dto/update-business-configuration.dto';

@Controller('business-configurations')
export class BusinessConfigurationsController {
  constructor(
    private readonly businessConfigurationsService: BusinessConfigurationsService,
  ) {}

  @Post()
  create(
    @Body() createBusinessConfigurationDto: CreateBusinessConfigurationDto,
  ) {
    return this.businessConfigurationsService.create(
      createBusinessConfigurationDto,
    );
  }

  @Get()
  findAll() {
    return this.businessConfigurationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessConfigurationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBusinessConfigurationDto: UpdateBusinessConfigurationDto,
  ) {
    return this.businessConfigurationsService.update(
      +id,
      updateBusinessConfigurationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessConfigurationsService.remove(+id);
  }
}
