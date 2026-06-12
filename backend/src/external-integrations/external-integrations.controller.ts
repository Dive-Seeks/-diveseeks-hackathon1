import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExternalIntegrationsService } from './external-integrations.service';
import { CreateExternalIntegrationDto } from './dto/create-external-integration.dto';
import { UpdateExternalIntegrationDto } from './dto/update-external-integration.dto';

@Controller('external-integrations')
export class ExternalIntegrationsController {
  constructor(
    private readonly externalIntegrationsService: ExternalIntegrationsService,
  ) {}

  @Post()
  create(@Body() createExternalIntegrationDto: CreateExternalIntegrationDto) {
    return this.externalIntegrationsService.create(
      createExternalIntegrationDto,
    );
  }

  @Get()
  findAll() {
    return this.externalIntegrationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.externalIntegrationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExternalIntegrationDto: UpdateExternalIntegrationDto,
  ) {
    return this.externalIntegrationsService.update(
      +id,
      updateExternalIntegrationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.externalIntegrationsService.remove(+id);
  }
}
