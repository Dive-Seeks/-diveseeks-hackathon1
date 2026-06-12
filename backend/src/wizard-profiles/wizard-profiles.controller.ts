import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { WizardProfilesService } from './wizard-profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { ApiTags } from '@nestjs/swagger';

class UpsertProfileDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsArray()
  cuisines?: string[];

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsString()
  dietaryType?: string;

  @IsOptional()
  @IsString()
  spiceRange?: string;

  @IsOptional()
  @IsArray()
  serviceModel?: string[];

  @IsOptional()
  @IsArray()
  allergens?: string[];

  @IsOptional()
  @IsString()
  lastJourney?: string;
}

@ApiTags('wizard-profiles')
@Controller('wizard-profiles')
@UseGuards(JwtAuthGuard)
export class WizardProfilesController {
  constructor(
    private readonly service: WizardProfilesService,
    private readonly tenantCls: TenantClsService,
  ) {}

  @Get('me')
  async getMyProfile(@Query('siteId') siteId?: string) {
    const tenantId = this.tenantCls.getTenantId()!;
    return this.service.findByTenantId(tenantId, siteId);
  }

  @Post('upsert')
  @HttpCode(200)
  async upsert(@Body() dto: UpsertProfileDto) {
    const tenantId = this.tenantCls.getTenantId()!;
    return this.service.upsert({ ...dto, tenantId });
  }
}
