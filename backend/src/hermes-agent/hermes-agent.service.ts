import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { InternalLlmKeyService } from '../ai-integration/internal-llm-key.service';
import { HermesAgentUnavailableError } from './hermes-agent.errors';
import { HermesAgentInstanceService } from './hermes-agent-instance.service';
import { HermesAgentSupervisorClient } from './hermes-agent-supervisor.client';

export interface HermesRunArgs {
  tenantId: string;
  userId: string;
  prompt: string;
}

interface HermesChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class HermesAgentService {
  private readonly logger = new Logger(HermesAgentService.name);

  constructor(
    private readonly registry: HermesAgentInstanceService,
    private readonly supervisor: HermesAgentSupervisorClient,
    private readonly llmKeys: InternalLlmKeyService,
    private readonly http: HttpService,
  ) {}

  /** Env allowlist ('*' or csv) short-circuits true; otherwise the tenant's DB toggle decides. */
  async isEnabledForTenant(tenantId: string): Promise<boolean> {
    const allow = process.env.HERMES_AGENT_ENABLED_TENANTS ?? '';
    if (allow.trim() === '*') {
      return true;
    }
    const allowed = allow
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(tenantId);
    if (allowed) {
      return true;
    }
    const row = await this.registry.getByTenant(tenantId);
    return row?.enabled ?? false;
  }

  async getSettings(
    tenantId: string,
  ): Promise<{ enabled: boolean; status: string }> {
    const row = await this.registry.getByTenant(tenantId);
    return {
      enabled: (await this.isEnabledForTenant(tenantId)) || false,
      status: row?.status ?? 'absent',
    };
  }

  async setEnabled(tenantId: string, enabled: boolean): Promise<void> {
    await this.registry.setEnabled(tenantId, enabled);
  }

  async runTask(args: HermesRunArgs): Promise<string> {
    const instance = await this.registry.ensureRow(args.tenantId);
    if (instance.status !== 'running') {
      const llm = await this.llmKeys.resolve(args.userId);
      await this.supervisor.start(args.tenantId, {
        apiServerKey: instance.apiServerKey,
        llm,
      });
      await this.registry.markStatus(args.tenantId, 'running');
    }

    try {
      const resp = await firstValueFrom(
        this.http.post(
          `${instance.endpoint}/v1/chat/completions`,
          {
            model: 'hermes-agent',
            messages: [{ role: 'user', content: args.prompt }],
          },
          {
            headers: { Authorization: `Bearer ${instance.apiServerKey}` },
            timeout: Number(process.env.HERMES_AGENT_TIMEOUT_MS ?? 300_000),
          },
        ),
      );
      const data = resp.data as HermesChatResponse;
      await this.registry.touchLastUsed(args.tenantId);
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      await this.registry.markStatus(args.tenantId, 'failed');
      throw new HermesAgentUnavailableError(
        `hermes call failed for tenant ${args.tenantId}: ${(err as Error).message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reapIdle(): Promise<void> {
    const idleMinutes = Number(process.env.HERMES_AGENT_IDLE_MINUTES ?? 30);
    const idle = await this.registry.findIdleRunning(idleMinutes);
    for (const inst of idle) {
      try {
        await this.supervisor.stop(inst.tenantId);
        await this.registry.markStatus(inst.tenantId, 'stopped');
        this.logger.log(`[hermes-agent] reaped idle instance ${inst.tenantId}`);
      } catch (err) {
        this.logger.warn(
          `[hermes-agent] reap failed for ${inst.tenantId}: ${(err as Error).message}`,
        );
      }
    }
  }
}
