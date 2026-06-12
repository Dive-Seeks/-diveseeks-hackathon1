import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  Logger,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { IsInt, IsPositive, Max } from 'class-validator';

class SetBudgetLimitDto {
  @IsInt()
  @IsPositive()
  @Max(1_000_000) // $10,000 cap — prevents accidental multi-million cent limits
  limitCents: number;
}

import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoordinatorService } from './coordinator.service';
import { CoordinatorJobService } from './coordinator-job.service';
import { CoordinatorSecurityService } from './coordinator-security.service';
import { CoordinatorWatchService } from './coordinator-watch.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { BudgetService } from './budget.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoordinatorJob } from './entities/coordinator-job.entity';
import { MetricsService } from '../observability/metrics.service';
import { HealthService } from '../observability/health.service';

@Controller('coordinator')
export class CoordinatorController {
  private readonly logger = new Logger(CoordinatorController.name);

  constructor(
    private readonly coordinatorService: CoordinatorService,
    private readonly jobService: CoordinatorJobService,
    private readonly securityService: CoordinatorSecurityService,
    private readonly watchService: CoordinatorWatchService,
    private readonly budgetService: BudgetService,
    private readonly redisCache: RedisCacheService,
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,

    @InjectRepository(CoordinatorJob)
    private readonly jobRepo: Repository<CoordinatorJob>,
  ) {}

  @Get('jobs')
  @UseGuards(JwtAuthGuard)
  async listJobs(@Req() req) {
    return this.jobRepo.find({
      where: { tenantId: req.user.tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard)
  async getJob(@Param('id') id: string, @Req() req) {
    return this.jobRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
    });
  }

  @Post('cycle')
  @UseGuards(JwtAuthGuard)
  async triggerCycle(@Req() req) {
    await this.coordinatorService.runCoordinatorCycle(
      req.user.tenantId,
      'manual',
    );
    return { success: true, message: 'Coordinator cycle triggered' };
  }

  @Post('heartbeat/ack')
  @UseGuards(JwtAuthGuard)
  async ackHeartbeat(
    @Body() body: { sessionId: string; specialistId: string },
    @Req() req,
  ) {
    const ackKey = `specialist:ack:${body.sessionId}`;
    await this.redisCache.set(ackKey, new Date().toISOString(), 120); // 120s TTL
    return { success: true };
  }

  @Post('tools/discover')
  @UseGuards(JwtAuthGuard)
  async discoverTools(
    @Body() body: { capability?: string; specialistHint?: string },
    @Req() req,
  ) {
    return this.coordinatorService.discoverTools(req.user.tenantId, body);
  }

  @Get('budget')
  @UseGuards(JwtAuthGuard)
  async getBudget(@Req() req) {
    return this.budgetService.getSpendSummary(req.user.tenantId);
  }

  @Post('budget/limit')
  @UseGuards(JwtAuthGuard)
  async setBudgetLimit(@Body() dto: SetBudgetLimitDto, @Req() req) {
    await this.budgetService.setLimit(req.user.tenantId, dto.limitCents);
    return { success: true };
  }

  @Post('budget/unpause')
  @UseGuards(JwtAuthGuard)
  async unpauseBudget(@Req() req) {
    await this.budgetService.unpause(req.user.tenantId);
    return { success: true };
  }

  @Get('budget/spend-events')
  @UseGuards(JwtAuthGuard)
  async getSpendEvents(@Req() req, @Query('limit') limit = 20) {
    const events = await this.budgetService.getRecentSpendEvents(
      req.user.tenantId,
      Number(limit),
    );
    return { data: events };
  }

  @Get('metrics')
  // No auth — internal only (firewall gates this as per spec)
  async prometheusMetrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(await this.metricsService.getMetrics());
  }

  @Get('health')
  async health() {
    return this.healthService.getHealth();
  }
}
