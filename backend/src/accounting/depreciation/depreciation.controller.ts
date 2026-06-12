import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DepreciationService } from './depreciation.service';
import { CreateDepreciationScheduleDto } from './dto/create-depreciation-schedule.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/depreciation')
export class DepreciationController {
  constructor(private readonly service: DepreciationService) {}

  @Post('schedules')
  createSchedule(
    @Request() req: any,
    @Body() dto: CreateDepreciationScheduleDto,
  ) {
    return this.service.createSchedule(req.user.tenantId, dto);
  }

  @Get('schedules')
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('schedules/:id')
  getSchedule(@Request() req: any, @Param('id') id: string) {
    return this.service.getSchedule(req.user.tenantId, id);
  }

  @Post('run')
  runPeriodDepreciation(
    @Request() req: any,
    @Body('periodDate') periodDate: string,
  ) {
    return this.service.runPeriodDepreciation(
      req.user.tenantId,
      new Date(periodDate),
    );
  }
}
