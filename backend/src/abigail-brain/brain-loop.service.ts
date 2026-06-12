import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { McpRegistryService } from '../mcp-registry/mcp-registry.service';
import { KnowledgeRegistrarService } from '../knowledge-registrar/knowledge-registrar.service';
import { McpServerRegistration } from '../mcp-registry/entities/mcp-server-registration.entity';
import { HermesGateway } from '../hermes/hermes.gateway';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { TenantJobService } from '../abigail-core/tenant-job.service';

export const BRAIN_LOOP_QUEUE = 'brain-loop';

export enum BrainLoopJobs {
  DISPATCH_TO_MCP = 'dispatch-to-mcp',
}

export interface BrainDispatchPayload {
  mcpId: string;
  capability: string;
  tenantId: string;
  taskId?: string;
  continuationId?: string;
  context: Record<string, any>;
  loopDepth: number; // [OC-2] Starts at 0, max 3
  toolPolicy?: { allow: string[]; deny: string[] } | null; // [OC-4]
}

@Injectable()
export class BrainLoopService {
  private readonly logger = new Logger(BrainLoopService.name);
  private isRunning = false;

  constructor(
    private readonly mcpRegistry: McpRegistryService,
    private readonly knowledgeRegistrar: KnowledgeRegistrarService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(BRAIN_LOOP_QUEUE) private readonly brainQueue: Queue,
    private readonly redisCache: RedisCacheService,
    private readonly tenantJobService: TenantJobService,
    @Optional() private readonly gateway?: HermesGateway,
  ) {}

  // ── 6-hour heartbeat cron ──────────────────────────────────────────────────

  @Cron('0 */6 * * *')
  async handleSixHourCycle(): Promise<void> {
    this.logger.log('Brain loop: 6-hour heartbeat triggered');
    await this.runLoopIteration('heartbeat');
  }

  // ── Event-driven early wake-ups ────────────────────────────────────────────

  @OnEvent('task_completed')
  async onTaskCompleted(payload: { taskId: string; tenantId: string }) {
    this.logger.debug(
      `Brain loop: early wake on task_completed ${payload.taskId}`,
    );
    await this.runLoopIteration('task_completed', payload.tenantId);
  }

  @OnEvent('specialist_evolved')
  async onSpecialistEvolved(payload: {
    specialistId: string;
    tenantId: string;
  }) {
    this.logger.debug(
      `Brain loop: early wake on specialist_evolved ${payload.specialistId}`,
    );
    await this.runLoopIteration('specialist_evolved', payload.tenantId);
  }

  @OnEvent('degraded_output_detected')
  async onDegradedOutput(payload: { tenantId: string; stepKey: string }) {
    this.logger.debug(`Brain loop: early wake on degraded_output_detected`);
    await this.runLoopIteration('degraded_output_detected', payload.tenantId);
  }

  @OnEvent('mcp_registered')
  async onMcpRegistered(payload: { mcpId: string }) {
    this.logger.debug(
      `Brain loop: early wake on mcp_registered ${payload.mcpId}`,
    );
    await this.runLoopIteration('mcp_registered');
  }

  // ── Core loop iteration ────────────────────────────────────────────────────

  async runLoopIteration(trigger: string, tenantId?: string): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Brain loop: iteration already in progress, skipping');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log(`Brain loop iteration START — trigger=${trigger}`);

      // Step 1: Load all active MCPs
      let activeMcps = await this.mcpRegistry.findActive();
      if (activeMcps.length === 0) {
        this.logger.debug('Brain loop: no active MCPs, iteration complete');
        return;
      }

      // [TASK 2] Brain Observation Phase
      activeMcps = await this.observe(activeMcps);
      if (activeMcps.length === 0) {
        this.logger.warn(
          'Brain loop: all MCPs filtered out by Observation Phase',
        );
        return;
      }

      // Step 2: Query pending continuations
      const continuations = tenantId
        ? await this.knowledgeRegistrar.getPendingContinuations(tenantId)
        : await this.knowledgeRegistrar.getAllPendingContinuations();

      this.logger.log(
        `Brain loop: ${activeMcps.length} active MCPs, ${continuations.length} pending continuations`,
      );

      // Step 3: Fan-out — dispatch continuations to capable MCPs via BullMQ
      const jobs: { name: string; data: BrainDispatchPayload; opts?: any }[] =
        [];

      for (const continuation of continuations) {
        const capable = this.findCapableMcp(
          activeMcps,
          continuation.pausedAtPhase,
        );
        if (!capable) continue;

        jobs.push({
          name: BrainLoopJobs.DISPATCH_TO_MCP,
          data: {
            mcpId: capable.mcpId,
            capability: continuation.pausedAtPhase,
            tenantId: continuation.tenantId,
            taskId: continuation.taskId,
            continuationId: continuation.id,
            context: continuation.resumeContext,
            loopDepth: 0, // Initial dispatch
          },
          opts: { priority: 1 }, // [OC-1] continuations (user-facing, highest urgency)
        });
      }

      // Also dispatch any capability-based work to MCPs that have no continuations
      const generalJobs = this.buildGeneralDispatch(activeMcps, tenantId);
      jobs.push(
        ...generalJobs.map((j) => ({
          ...j,
          opts: { priority: 5 }, // [OC-1] routine MCP dispatch (default)
        })),
      );

      if (jobs.length > 0) {
        await Promise.all(
          jobs.map((j) =>
            // BrainDispatchPayload intentionally carries tenantId as domain data
            // (used by handleDispatch for routing). TenantJobService.enqueue also
            // packs tenantId from CLS — the processor reads it via CLS, not payload.

            this.tenantJobService.enqueue(
              this.brainQueue,
              j.name,
              j.data as any,
              j.opts,
            ),
          ),
        );
        this.logger.log(`Brain loop: dispatched ${jobs.length} jobs to BullMQ`);
      }

      // Step 4: Emit loop heartbeat event to frontend
      this.emitAll('brain:loop:iteration', {
        trigger,
        activeMcpCount: activeMcps.length,
        continuationCount: continuations.length,
        dispatchedJobs: jobs.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Brain loop iteration DONE — dispatched=${jobs.length}`);
    } catch (error) {
      this.logger.error(`Brain loop iteration FAILED: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private findCapableMcp(
    mcps: McpServerRegistration[],
    requiredCapability: string,
  ): McpServerRegistration | null {
    return (
      mcps.find((m) => m.capabilities.includes(requiredCapability)) ?? null
    );
  }

  private buildGeneralDispatch(
    mcps: McpServerRegistration[],
    tenantId?: string,
  ): { name: string; data: BrainDispatchPayload }[] {
    // Each active MCP gets a periodic "check-in" job if it has a heartbeat capability
    return mcps
      .filter((m) => m.capabilities.includes('self_check'))
      .map((m) => ({
        name: BrainLoopJobs.DISPATCH_TO_MCP,
        data: {
          mcpId: m.mcpId,
          capability: 'self_check',
          tenantId: tenantId ?? m.teamId,
          context: { trigger: 'periodic_check' },
          loopDepth: 0,
        },
      }));
  }

  private emitAll(event: string, payload: object): void {
    if (this.gateway?.server) {
      this.gateway.server.emit(event, payload);
    }
  }

  // [TASK 2] Brain Observation Phase
  // Reads coordinator:flags:{tenantId}:{specialistName} — written by CoordinatorWatchService.auditAgents()
  private async observe(
    mcps: McpServerRegistration[],
  ): Promise<McpServerRegistration[]> {
    const filtered: McpServerRegistration[] = [];
    for (const mcp of mcps) {
      try {
        // An MCP may be assigned to multiple specialists — it is degraded if ANY assigned specialist is flagged
        const assignedTo = Array.isArray(mcp.assignedTo)
          ? mcp.assignedTo
          : mcp.assignedTo === 'all'
            ? [] // 'all' means platform-wide; don't filter these
            : [mcp.assignedTo];

        let degraded = false;
        for (const specialistName of assignedTo) {
          const flagKey = `coordinator:flags:${mcp.teamId}:${specialistName}`;
          const flags = await this.redisCache.get<string[]>(flagKey);
          if (
            flags &&
            (flags.includes('high_failure_rate') ||
              flags.includes('overloaded'))
          ) {
            this.logger.warn(
              `[Brain] Observation Phase: Skipping MCP ${mcp.mcpId} — specialist ${specialistName} flagged: ${flags.join(', ')}`,
            );
            degraded = true;
            break;
          }
        }
        if (!degraded) filtered.push(mcp);
      } catch (e) {
        // Fail-open on Redis error — never block dispatch on infrastructure failure
        this.logger.warn(
          `[Brain] Redis fail-open during observe(): ${(e as Error).message}`,
        );
        filtered.push(mcp);
      }
    }
    return filtered;
  }
}
