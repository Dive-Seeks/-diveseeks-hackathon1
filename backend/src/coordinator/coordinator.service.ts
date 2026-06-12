import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoordinatorSecurityService } from './coordinator-security.service';
import { CoordinatorJobService } from './coordinator-job.service';
import { CoordinatorWatchService } from './coordinator-watch.service';
import { HermesGateway } from '../hermes/hermes.gateway';
import { McpRegistryService } from '../mcp-registry/mcp-registry.service';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class CoordinatorService implements OnModuleInit {
  private readonly logger = new Logger(CoordinatorService.name);

  constructor(
    private readonly jobService: CoordinatorJobService,
    private readonly securityService: CoordinatorSecurityService,
    private readonly watchService: CoordinatorWatchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mcpRegistry: McpRegistryService,
    private readonly metricsService: MetricsService,
    @Optional() private readonly gateway?: HermesGateway,
  ) {}

  onModuleInit() {
    // Metrics registration moved to MetricsService
  }

  // Called by CoordinatorCronService — the main orchestration tick
  async runCoordinatorCycle(tenantId: string, trigger: string): Promise<void> {
    const start = Date.now();
    this.metricsService.getCoordinatorCounters().cycle.inc({ trigger });

    this.logger.log(
      `Starting coordinator cycle for tenant ${tenantId} triggered by ${trigger}`,
    );

    // 1. Emit heartbeat — frontend knows Abigail is alive
    this.gateway?.server
      .to(`tenant:${tenantId}`)
      .emit('coordinator:heartbeat', {
        tenantId,
        trigger,
        at: new Date().toISOString(),
      });

    // 2. Security check FIRST — if platform is unhealthy, skip job assignment
    const securityReport = await this.securityService.scan(tenantId);
    if (securityReport.criticalIssues.length > 0) {
      this.metricsService
        .getCoordinatorCounters()
        .securityIssue.inc({ tenantId });

      await this.jobService.createJob(tenantId, 'security_scan', {
        subject: 'Critical issues detected — job assignment suspended',
        findings: securityReport as any,
        status: 'done',
      });

      this.gateway?.server.to(`tenant:${tenantId}`).emit('coordinator:alert', {
        tenantId,
        severity: 'critical',
        message: `Security scan found ${securityReport.criticalIssues.length} critical issues`,
        findings: securityReport.criticalIssues,
      });

      this.logger.warn(
        `Coordinator cycle for ${tenantId} suspended: ${securityReport.criticalIssues.length} critical issues`,
      );
      return;
    }

    // 3. Agent behaviour audit
    await this.watchService.auditAgents(tenantId);

    // 4. Practice check — catch error patterns before new work starts
    const practiceReport = await this.securityService.checkPractices(tenantId);

    // 5. Create plan / spec jobs for pending vision gaps
    await this.jobService.planAndAssign(tenantId, practiceReport);

    const duration = (Date.now() - start) / 1000;
    this.metricsService
      .getCoordinatorHistograms()
      .cycleDuration.observe({ trigger }, duration);
    this.logger.log(
      `Coordinator cycle for ${tenantId} completed in ${duration}s`,
    );
  }

  async discoverTools(
    tenantId: string,
    query: { capability?: string; specialistHint?: string },
  ) {
    const activeMcps = await this.mcpRegistry.findActive(tenantId);
    const catalog = activeMcps.flatMap((mcp) =>
      (mcp as any).toolsAvailable.map((tool) => ({
        mcpId: (mcp as any).mcpId,
        toolName: tool,
        capabilities: (mcp as any).capabilities,
        specialist: this.resolveSpecialist(tool),
      })),
    );

    // Filter by capability hint if provided
    const filtered = query.capability
      ? catalog.filter((t) =>
          t.toolName.toLowerCase().includes(query.capability!.toLowerCase()),
        )
      : catalog;

    return {
      tools: filtered,
      total: filtered.length,
      discoveredAt: new Date(),
    };
  }

  // Specialist session liveness ack (OC-3)
  async recordHeartbeatAck(tenantId: string, sessionId: string) {
    // This will be implemented using RedisCacheService in the Controller call or here
    // For now, Abigail knows you're alive.
  }

  private resolveSpecialist(toolName: string): string {
    const tool = toolName.toLowerCase();
    if (tool.includes('git') || tool.includes('code') || tool.includes('file'))
      return 'rex';
    if (
      tool.includes('browser') ||
      tool.includes('scrape') ||
      tool.includes('fetch')
    )
      return 'nova';
    if (
      tool.includes('test') ||
      tool.includes('jest') ||
      tool.includes('playwright')
    )
      return 'sage';
    return 'rex';
  }
}
