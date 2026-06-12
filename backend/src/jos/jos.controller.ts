import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  Param,
} from '@nestjs/common';
import { JosService } from './jos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';

export class JosRequestDto {
  @IsString() @IsNotEmpty() intent: string;
  @IsOptional() @IsObject() context?: Record<string, string>;
  @IsOptional() @IsString() surface?: string;
}

export class CreateAdCampaignDto {
  @IsString() @IsNotEmpty() campaignName: string;
  @IsString() @IsNotEmpty() platform: string;
  @IsInt() @Min(1) allocatedBudgetCents: number;
  @IsInt() @Min(1) benchmarkCprCents: number;
  @IsString() @IsNotEmpty() startDate: string;
  @IsOptional() @IsString() endDate?: string;
}

@Controller('jos')
@UseGuards(JwtAuthGuard)
export class JosController {
  constructor(
    private readonly josService: JosService,
    private readonly tenantCls: TenantClsService,
  ) {}

  @Post('request')
  @HttpCode(201)
  async request(@Body() dto: JosRequestDto) {
    const tenantId = this.tenantCls.getTenantId();
    return this.josService.processRequest(
      {
        intent: dto.intent,
        context: dto.context ?? {},
        surface: dto.surface ?? 'sidebar',
      },
      tenantId,
    );
  }

  @Get('snapshot')
  async snapshot() {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.loadSnapshotPublic(tenantId);
  }

  @Get('business-type')
  async businessType() {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    const type = await this.josService.getBusinessType(tenantId);
    return { type };
  }

  @Get('growth-report')
  async growthReport() {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.getGrowthReport(tenantId);
  }

  @Post('set-ad-budget')
  @HttpCode(200)
  async setAdBudget(@Body() body: { monthlyBudgetCents: number }) {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    await this.josService.setAdBudget(tenantId, body.monthlyBudgetCents);
    return { ok: true };
  }

  @Get('ad-campaigns')
  async getAdCampaigns() {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.getAdCampaigns(tenantId);
  }

  @Post('ad-campaigns')
  @HttpCode(201)
  async createAdCampaign(@Body() dto: CreateAdCampaignDto) {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.createAdCampaign(tenantId, dto);
  }

  @Post('ad-campaigns/:id/approve-scale')
  @HttpCode(200)
  async approveAdScale(@Param('id') id: string) {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.approveAdScale(id, tenantId);
  }

  @Post('ad-campaigns/:id/kill')
  @HttpCode(200)
  async killAdCampaign(@Param('id') id: string) {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.josService.killAdCampaign(id, tenantId);
  }
}
