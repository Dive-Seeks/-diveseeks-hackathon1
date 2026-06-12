import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleAuditResult } from './entities/cycle-audit-result.entity';
import { RedisProbeService } from './probes/redis-probe.service';
import { DbProbeService } from './probes/db-probe.service';
import { QueueProbeService } from './probes/queue-probe.service';
import { HttpProbeService } from './probes/http-probe.service';
import { LlmProbeService } from './probes/llm-probe.service';

@Injectable()
export class CycleAuditService {
  private readonly logger = new Logger(CycleAuditService.name);
  private isRunning = false;

  constructor(
    @InjectRepository(CycleAuditResult)
    private readonly auditRepo: Repository<CycleAuditResult>,
    private readonly redisProbe: RedisProbeService,
    private readonly dbProbe: DbProbeService,
    private readonly queueProbe: QueueProbeService,
    private readonly httpProbe: HttpProbeService,
    private readonly llmProbe: LlmProbeService,
  ) {}

  @Cron(process.env.CYCLE_AUDIT_INTERVAL_CRON || '0 */5 * * * *')
  async handleCron() {
    if (this.isRunning) {
      this.logger.warn('Previous audit cycle still running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      await this.runAuditCycle();
    } catch (error) {
      this.logger.error('Audit cycle failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runAuditCycle(
    tenantId: string | null = null,
  ): Promise<CycleAuditResult> {
    const start = Date.now();
    this.logger.log(
      `Starting audit cycle${tenantId ? ` for tenant ${tenantId}` : ''}`,
    );

    const [redisRes, dbRes, queueRes, httpRes, llmRes] =
      await Promise.allSettled([
        this.redisProbe.run(),
        this.dbProbe.run(),
        this.queueProbe.run(),
        this.httpProbe.run(),
        this.llmProbe.run(),
      ]);

    const result = new CycleAuditResult();
    result.ranAt = new Date();
    result.tenantId = tenantId;
    result.alerts = [];

    // --- Collect Results ---

    // Redis
    if (redisRes.status === 'fulfilled') {
      result.redisOk = redisRes.value.ok;
      result.redisLatencyMs = redisRes.value.latencyMs;
      result.alerts.push(...redisRes.value.alerts);
    } else {
      result.redisOk = false;
      result.alerts.push({
        probe: 'redis',
        severity: 'critical' as const,
        message: 'Probe crash',
      });
    }

    // DB
    if (dbRes.status === 'fulfilled') {
      result.dbLatencyMs = dbRes.value.latencyMs;
      result.alerts.push(...dbRes.value.alerts);
    } else {
      result.alerts.push({
        probe: 'db',
        severity: 'critical' as const,
        message: 'Probe crash',
      });
    }

    // Queue
    if (queueRes.status === 'fulfilled') {
      result.queueResults = queueRes.value.queueResults;
      result.alerts.push(...queueRes.value.alerts);
    } else {
      result.alerts.push({
        probe: 'queue',
        severity: 'critical' as const,
        message: 'Probe crash',
      });
    }

    // HTTP
    if (httpRes.status === 'fulfilled') {
      result.httpP95Ms = Math.round(httpRes.value.p95 * 1000);
      result.httpErrorRate = httpRes.value.errorRate;
      result.alerts.push(...httpRes.value.alerts);
    } else {
      result.alerts.push({
        probe: 'http',
        severity: 'critical' as const,
        message: 'Probe crash',
      });
    }

    // LLM
    if (llmRes.status === 'fulfilled') {
      result.llmResults = {
        server: llmRes.value.server,
        tenantKeys: llmRes.value.tenantKeys,
      };
      result.alerts.push(...llmRes.value.alerts);
    } else {
      result.alerts.push({
        probe: 'llm',
        severity: 'critical' as const,
        message: 'Probe crash',
      });
    }

    // Overall Status
    const severities = result.alerts.map((a) => a.severity);
    if (severities.includes('critical')) {
      result.overallStatus = 'critical';
    } else if (severities.includes('degraded')) {
      result.overallStatus = 'degraded';
    } else {
      result.overallStatus = 'healthy';
    }

    result.durationMs = Date.now() - start;

    const saved = await this.auditRepo.save(result);
    this.logger.log(
      `Audit cycle completed in ${result.durationMs}ms with status: ${result.overallStatus}`,
    );

    return saved;
  }
}
