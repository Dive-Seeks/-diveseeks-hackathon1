import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsBoolean, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { DreamerScheduleService } from './dreamer-schedule.service';

class UpdateDreamerConfigDto {
  @IsString()
  @Matches(
    /^(\*|([0-5]?\d))\s+(\*|(1?[0-9]|2[0-3]))\s+(\*|([1-9]|[12]\d|3[01]))\s+(\*|([1-9]|1[0-2]))\s+(\*|[0-6])$/,
    {
      message: 'cronExpression must be a valid cron (e.g. "30 2 * * *")',
    },
  )
  cronExpression: string;

  @IsBoolean()
  enabled: boolean;
}

@Controller('dreamer')
@UseGuards(JwtAuthGuard)
export class DreamerConfigController {
  constructor(
    private readonly scheduleService: DreamerScheduleService,
    private readonly tenantCls: TenantClsService,
  ) {}

  @Patch('config')
  async updateConfig(@Body() dto: UpdateDreamerConfigDto) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    await this.scheduleService.updateSchedule(
      tenantId,
      dto.cronExpression,
      dto.enabled,
    );
    return { cronExpression: dto.cronExpression, enabled: dto.enabled };
  }
}
