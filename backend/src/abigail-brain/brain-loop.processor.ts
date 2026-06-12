import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BRAIN_LOOP_QUEUE,
  BrainLoopJobs,
  BrainDispatchPayload,
} from './brain-loop.service';
import { McpRegistryService } from '../mcp-registry/mcp-registry.service';
import { McpToolbeltService } from '../mcp-registry/mcp-toolbelt.service';
import { KnowledgeRegistrarService } from '../knowledge-registrar/knowledge-registrar.service';
import { McpDispatchService } from '../mcp-registry/mcp-dispatch.service';
import { TenantAwareProcessor } from '../abigail-core/tenant-aware.processor';

@Processor(BRAIN_LOOP_QUEUE, { concurrency: 3 })
export class BrainLoopProcessor extends TenantAwareProcessor {
  private readonly logger = new Logger(BrainLoopProcessor.name);

  constructor(
    cls: ClsService,
    private readonly mcpRegistry: McpRegistryService,
    private readonly toolbelt: McpToolbeltService,
    private readonly knowledgeRegistrar: KnowledgeRegistrarService,
    private readonly mcpDispatch: McpDispatchService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(cls);
  }

  async handleJob(
    job: Job<BrainDispatchPayload>,
    token?: string,
  ): Promise<void> {
    if (job.name === BrainLoopJobs.DISPATCH_TO_MCP) {
      await this.handleDispatch(job.data);
    }
  }

  private async handleDispatch(payload: BrainDispatchPayload): Promise<void> {
    const { mcpId, capability, tenantId, continuationId, context, toolPolicy } =
      payload;

    // [OC-2] Tool-loop cycle guard
    if (payload.loopDepth >= 3) {
      this.logger.error(
        `Tool-loop detected for MCP ${mcpId} at depth ${payload.loopDepth} — aborting`,
      );
      this.eventEmitter.emit('coordinator:alert', {
        tenantId: payload.tenantId,
        severity: 'critical',
        message: `Tool-loop cycle detected at depth ${payload.loopDepth}`,
        mcpId: payload.mcpId,
      });
      return; // Do NOT throw — throwing retries, which makes the loop worse
    }

    // 1. Verify MCP is still active (could have gone stale between enqueue and pick-up)
    const mcp = await this.mcpRegistry.findByMcpId(mcpId);
    if (!mcp || mcp.status !== 'active') {
      this.logger.warn(
        `Skipping dispatch: MCP ${mcpId} is ${mcp?.status ?? 'not found'}`,
      );
      return;
    }

    // 2. Call the tool on the MCP process
    this.logger.log(
      `Dispatching capability="${capability}" to MCP ${mcpId} (tenant=${tenantId})`,
    );
    const result = await this.mcpDispatch.callCapability(
      mcp,
      capability,
      context,
      toolPolicy,
    );

    if (!result.success) {
      this.logger.error(
        `MCP dispatch failed for ${mcpId} capability="${capability}": ${result.error}`,
      );
      // Do NOT re-throw — let BullMQ retry policy handle it via job failure
      throw new Error(result.error);
    }

    this.logger.debug(
      `MCP ${mcpId} tool "${result.toolName}" completed in ${result.durationMs}ms`,
    );

    // 3. Resume any paused continuation
    if (continuationId) {
      await this.knowledgeRegistrar.resumeTask(continuationId, {
        mcpId,
        capability,
        toolName: result.toolName,
        output: result.output,
        durationMs: result.durationMs,
        dispatchedAt: new Date().toISOString(),
        context,
      });
      this.logger.debug(`Continuation ${continuationId} marked RESUMED`);
    }
  }
}
