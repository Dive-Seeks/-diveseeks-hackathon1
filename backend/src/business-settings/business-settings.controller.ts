import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BusinessSettingsService } from './business-settings.service';
import { CreateBusinessSettingDto } from './dto/create-business-setting.dto';
import { UpdateBusinessSettingDto } from './dto/update-business-setting.dto';

@Controller('business-settings')
export class BusinessSettingsController {
  constructor(
    private readonly businessSettingsService: BusinessSettingsService,
  ) {}

  @Post()
  create(@Body() createBusinessSettingDto: CreateBusinessSettingDto) {
    return this.businessSettingsService.create(createBusinessSettingDto);
  }

  @Get()
  findAll() {
    return this.businessSettingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessSettingsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBusinessSettingDto: UpdateBusinessSettingDto,
  ) {
    return this.businessSettingsService.update(+id, updateBusinessSettingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessSettingsService.remove(+id);
  }
}
