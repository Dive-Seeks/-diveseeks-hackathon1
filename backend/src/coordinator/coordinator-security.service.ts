import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { CoordinatorJob } from './entities/coordinator-job.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { McpServerRegistration } from '../mcp-registry/entities/mcp-server-registration.entity';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { BudgetService } from './budget.service';

export interface SecurityIssue {
  check: string;
  severity: 'critical' | 'warning';
  message: string;
  details?: any;
}

export interface SecurityReport {
  criticalIssues: SecurityIssue[];
  warnings: SecurityIssue[];
  scannedAt: Date;
}

export interface PracticeReport {
  badPracticeCount: number;
  badPractices: { pattern: string; count: number }[];
  recentFailureRate: number;
  checkedAt: Date;
}

@Injectable()
export class CoordinatorSecurityService {
  private readonly logger = new Logger(CoordinatorSecurityService.name);

  constructor(
    @InjectRepository(CoordinatorJob)
    private readonly jobRepo: Repository<CoordinatorJob>,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    @InjectRepository(McpServerRegistration)
    private readonly mcpRepo: Repository<McpServerRegistration>,
    private readonly redisCache: RedisCacheService,
    private readonly budgetService: BudgetService,
  ) {}

  // Fast scan — runs every 4-hour cycle (~100ms, zero LLM)
  async scan(tenantId: string): Promise<SecurityReport> {
    const checks = await Promise.all([
      this.checkRevokedMcps(tenantId),
      this.checkStaleMcps(tenantId),
      this.checkExpiredSessions(tenantId),
      this.checkBudgetOverrun(tenantId),
      this.checkFailedJobs(tenantId),
    ]);

    const issues = checks.filter((c) => c !== null);
    const criticalIssues = issues.filter((c) => c.severity === 'critical');
    const warnings = issues.filter((c) => c.severity === 'warning');

    return { criticalIssues, warnings, scannedAt: new Date() };
  }

  // Deep scan — runs weekly Monday 02:00
  async deepScan(tenantId: string): Promise<void> {
    const report = await this.scan(tenantId);

    // Additional deep checks
    const envCheck = await this.checkEnvVarHealth();
    const agentIntegrityCheck = await this.checkAgentOrgIntegrity(tenantId);

    await this.jobRepo.save({
      tenantId,
      kind: 'security_scan',
      status: 'done',
      subject: 'Weekly deep security scan',
      findings: {
        ...report,
        envCheck,
        agentIntegrityCheck,
      },
      completedAt: new Date(),
    });
  }

  // Good/bad practice check — called before plan assignment
  async checkPractices(tenantId: string): Promise<PracticeReport> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = await this.taskSessionRepo.find({
      where: {
        teamId: tenantId,
        status: 'failed',
        updatedAt: MoreThan(oneHourAgo),
      },
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    const errorCategories: Record<string, number> = {};
    for (const session of recentSessions) {
      const pattern = this.classifyError(
        (session.context as any)?.errorMessage ?? '',
      );
      errorCategories[pattern] = (errorCategories[pattern] ?? 0) + 1;
    }

    const badPractices = Object.entries(errorCategories)
      .filter(([, count]) => count > 3)
      .map(([pattern, count]) => ({ pattern, count }));

    return {
      badPracticeCount: badPractices.length,
      badPractices,
      recentFailureRate: recentSessions.length / 20,
      checkedAt: new Date(),
    };
  }

  private async checkRevokedMcps(
    tenantId: string,
  ): Promise<SecurityIssue | null> {
    const revoked = await this.mcpRepo.find({
      where: { teamId: tenantId, status: 'revoked' },
    });
    if (revoked.length > 0) {
      return {
        check: 'revoked_mcps',
        severity: 'critical',
        message: `${revoked.length} revoked MCP(s) detected`,
        details: revoked.map((m) => m.mcpId),
      };
    }
    return null;
  }

  private async checkStaleMcps(
    tenantId: string,
  ): Promise<SecurityIssue | null> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stale = await this.mcpRepo.find({
      where: {
        teamId: tenantId,
        status: 'active',
        lastHeartbeatAt: LessThan(tenMinutesAgo),
      },
    });

    if (stale.length > 0) {
      const totalActive = await this.mcpRepo.count({
        where: { teamId: tenantId, status: 'active' },
      });
      const severity =
        stale.length / totalActive > 0.5 ? 'critical' : 'warning';
      return {
        check: 'stale_mcps',
        severity,
        message: `${stale.length} stale MCP(s) detected`,
        details: stale.map((m) => m.mcpId),
      };
    }
    return null;
  }

  private async checkExpiredSessions(
    tenantId: string,
  ): Promise<SecurityIssue | null> {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuck = await this.taskSessionRepo.find({
      where: {
        teamId: tenantId,
        status: 'running',
        updatedAt: LessThan(thirtyMinAgo),
      },
    });

    if (stuck.length === 0) return null;

    // [OC-3] Distinguish zombie (no heartbeat ack) from slow (ack present)
    const zombies: string[] = [];
    const slow: string[] = [];
    for (const session of stuck) {
      const ack = await this.redisCache.get(`specialist:ack:${session.id}`);
      if (ack) {
        slow.push(session.id);
      } else {
        zombies.push(session.id);
      }
    }

    if (zombies.length > 0) {
      return {
        check: 'stuck_sessions',
        severity: 'critical',
        message: `${zombies.length} zombie session(s) — stuck >30min with no heartbeat ack`,
        details: { zombies, slow },
      };
    }

    return {
      check: 'stuck_sessions',
      severity: 'warning',
      message: `${slow.length} slow session(s) — stuck >30min but still heartbeating`,
      details: { zombies, slow },
    };
  }

  private async checkBudgetOverrun(
    tenantId: string,
  ): Promise<SecurityIssue | null> {
    return this.budgetService.checkBudget(tenantId);
  }

  private async checkFailedJobs(
    tenantId: string,
  ): Promise<SecurityIssue | null> {
    // Stub: implement BullMQ failure check
    return null;
  }

  private async checkEnvVarHealth(): Promise<any> {
    const criticalVars = [
      'BRAIN_SHARED_SECRET', // MCP registration HMAC signing
      'DEEPSEEK_API_KEY', // Layer 2 primary — all brain/specialist/compaction calls
      'GOOGLE_AI_API_KEY', // Layer 2 fallback — Gemini Flash + knowledge synthesis
    ];
    const missing = criticalVars.filter((v) => !process.env[v]);
    return { missing, status: missing.length === 0 ? 'healthy' : 'degraded' };
  }

  private async checkAgentOrgIntegrity(tenantId: string): Promise<any> {
    // Stub: check for orphaned agents or duplicate CEOs
    return { status: 'healthy' };
  }

  private classifyError(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('tenant_id') || msg.includes('cross-tenant'))
      return 'multi_tenancy_leak';
    if (msg.includes('timeout') || msg.includes('etimeout')) return 'timeout';
    if (msg.includes('undefined is not') || msg.includes('cannot read'))
      return 'null_safety';
    if (
      msg.includes('econnrefused') ||
      msg.includes('redis') ||
      msg.includes('postgres')
    )
      return 'infrastructure';
    return 'unknown';
  }
}
