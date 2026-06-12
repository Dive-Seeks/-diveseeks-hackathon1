import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoordinatorService } from './coordinator.service';
import { CoordinatorJobService } from './coordinator-job.service';
import { CoordinatorSecurityService } from './coordinator-security.service';
import { CoordinatorWatchService } from './coordinator-watch.service';
import { BudgetService } from './budget.service';
import { McpServerRegistration } from '../mcp-registry/entities/mcp-server-registration.entity';

@Injectable()
export class CoordinatorCronService {
  private readonly logger = new Logger(CoordinatorCronService.name);

  constructor(
    private readonly coordinatorService: CoordinatorService,
    private readonly jobService: CoordinatorJobService,
    private readonly securityService: CoordinatorSecurityService,
    private readonly watchService: CoordinatorWatchService,
    private readonly budgetService: BudgetService,
    @InjectRepository(McpServerRegistration)
    private readonly mcpRepo: Repository<McpServerRegistration>,
  ) {}

  // ── Main coordinator pulse — every 4 hours ─────────────────────────────────
  @Cron('0 */4 * * *')
  async mainCycle(): Promise<void> {
    this.logger.log('Starting scheduled coordinator cycle...');
    const tenants = await this.getTenants();
    for (const tenantId of tenants) {
      await this.coordinatorService.runCoordinatorCycle(tenantId, 'scheduled');
    }
  }

  // ── Daily plan creation — 07:00 ───
  @Cron('0 7 * * *')
  async dailyPlanCreation(): Promise<void> {
    this.logger.log('Starting daily plan creation...');
    const tenants = await this.getTenants();
    for (const tenantId of tenants) {
      await this.jobService.createDailyPlans(tenantId);
    }
  }

  // ── Weekly security deep scan — Monday 02:00 ───────────────────────────────
  @Cron('0 2 * * 1')
  async weeklySecurityScan(): Promise<void> {
    this.logger.log('Starting weekly deep security scan...');
    const tenants = await this.getTenants();
    for (const tenantId of tenants) {
      await this.securityService.deepScan(tenantId);
    }
  }

  // ── Nightly behaviour audit — 03:30 ────────────────────────────────────────
  @Cron('30 3 * * *')
  async nightlyBehaviourAudit(): Promise<void> {
    this.logger.log('Starting nightly behaviour audit...');
    const tenants = await this.getTenants();
    for (const tenantId of tenants) {
      await this.watchService.auditAgents(tenantId);
    }
  }

  // ── Monthly budget reset — 1st of month 00:00 UTC ────────────────────────
  @Cron('0 0 1 * *')
  async resetBudgetWindows(): Promise<void> {
    this.logger.log('Starting monthly budget window reset...');
    const tenants = await this.getTenants();
    for (const tenantId of tenants) {
      await this.budgetService.resetMonthlyWindow(tenantId);
    }
  }

  // ── Event-driven: task completed → check if spec/plan needed ──────────────
  @OnEvent('task_completed')
  async onTaskCompleted(payload: {
    taskId: string;
    tenantId: string;
  }): Promise<void> {
    this.logger.log(
      `Task completed: ${payload.taskId} for tenant ${payload.tenantId}. Triggering cycle.`,
    );
    await this.coordinatorService.runCoordinatorCycle(
      payload.tenantId,
      'task_completed',
    );
  }

  // ── Event-driven: specialist degraded → immediate behaviour audit ──────────
  @OnEvent('degraded_output_detected')
  async onDegradedOutput(payload: {
    specialistId: string;
    tenantId: string;
  }): Promise<void> {
    this.logger.warn(
      `Degraded output from ${payload.specialistId} for tenant ${payload.tenantId}.`,
    );
    await this.watchService.flagDegradedSpecialist(
      payload.tenantId,
      payload.specialistId,
    );
  }

  private async getTenants(): Promise<string[]> {
    // Get unique tenant IDs from active MCP registrations as a proxy for active tenants
    const registrations = await this.mcpRepo
      .createQueryBuilder('mcp')
      .select('DISTINCT mcp."teamId"', 'tenantId')
      .getRawMany();

    return registrations.map((r) => r.tenantId);
  }
}
