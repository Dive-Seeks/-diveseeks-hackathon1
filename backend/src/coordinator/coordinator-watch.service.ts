import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { CoordinatorJob } from './entities/coordinator-job.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HermesGateway } from '../hermes/hermes.gateway';

export interface AgentBehaviourReport {
  agentId: string;
  agentName: string;
  flags: string[];
  failureRate: number;
  avgDuration: number;
}

@Injectable()
export class CoordinatorWatchService {
  private readonly logger = new Logger(CoordinatorWatchService.name);

  constructor(
    @InjectRepository(CoordinatorJob)
    private readonly jobRepo: Repository<CoordinatorJob>,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    @InjectRepository(Agent)
    private readonly agentsRepo: Repository<Agent>,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisCache: RedisCacheService,
    @Optional() private readonly gateway?: HermesGateway,
  ) {}

  async auditAgents(tenantId: string): Promise<void> {
    const agents = await this.agentsRepo.find({
      where: { tenantId, status: Not('terminated') },
    });

    const report: AgentBehaviourReport[] = [];

    for (const agent of agents) {
      const recentSessions = await this.taskSessionRepo.find({
        where: { teamId: tenantId, specialist: agent.name as any },
        order: { updatedAt: 'DESC' },
        take: 10,
      });

      if (recentSessions.length === 0) continue;

      const failureRate =
        recentSessions.filter((s) => s.status === 'failed').length /
        recentSessions.length;
      const avgDuration = this.avgDuration(recentSessions);

      const lastUpdated = recentSessions[0].updatedAt.getTime();
      const isIdle = Date.now() - lastUpdated > 24 * 60 * 60 * 1000;
      const isOverloaded =
        recentSessions.filter((s) => s.status === 'running').length > 3;

      const flags: string[] = [];
      if (failureRate > 0.5) flags.push('high_failure_rate');
      if (isIdle) flags.push('idle_24h');
      if (isOverloaded) flags.push('overloaded');
      if (avgDuration > 120_000) flags.push('slow_execution');

      // [TASK 2] Brain Observation Phase — persist critical flags to Redis
      // Key: coordinator:flags:{tenantId}:{specialistName} — read by brain-loop observe()
      const flagKey = `coordinator:flags:${tenantId}:${agent.name}`;
      if (flags.includes('high_failure_rate') || flags.includes('overloaded')) {
        await this.redisCache.set(flagKey, flags, 18000); // 5h TTL — outlasts 4h coordinator cycle
      } else {
        await this.redisCache.del(flagKey);
      }

      if (flags.length > 0) {
        report.push({
          agentId: agent.id,
          agentName: agent.name,
          flags,
          failureRate,
          avgDuration,
        });

        // Emit degraded event if failure rate is critical
        if (failureRate > 0.7) {
          this.eventEmitter.emit('degraded_output_detected', {
            specialistId: agent.name,
            tenantId,
          });
        }
      }
    }

    if (report.length > 0) {
      await this.jobRepo.save({
        tenantId,
        kind: 'behaviour_audit',
        status: 'done',
        subject: `${report.length} agent(s) flagged`,
        findings: { agents: report },
        completedAt: new Date(),
      });

      // WebSocket alert to frontend
      this.gateway?.server
        .to(`tenant:${tenantId}`)
        .emit('coordinator:agent_flags', {
          tenantId,
          flaggedAgents: report,
        });
    }
  }

  async flagDegradedSpecialist(
    tenantId: string,
    specialistId: string,
  ): Promise<void> {
    await this.jobRepo.save({
      tenantId,
      kind: 'behaviour_audit',
      status: 'done',
      subject: `Specialist ${specialistId} flagged: degraded output`,
      findings: { specialistId, trigger: 'degraded_output_detected' },
      completedAt: new Date(),
    });
  }

  private avgDuration(sessions: TaskSession[]): number {
    const completed = sessions.filter((s) => s.completedAt && s.createdAt);
    if (completed.length === 0) return 0;
    const sum = completed.reduce(
      (acc, s) => acc + (s.completedAt!.getTime() - s.createdAt.getTime()),
      0,
    );
    return sum / completed.length;
  }
}
