import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HermesAgentUnavailableError } from './hermes-agent.errors';

export interface HermesLlmConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export interface HermesStartPayload {
  apiServerKey: string;
  llm: HermesLlmConfig | null;
}

@Injectable()
export class HermesAgentSupervisorClient {
  private readonly logger = new Logger(HermesAgentSupervisorClient.name);

  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return process.env.SUPERVISOR_URL ?? '';
  }

  private headers() {
    return { 'x-supervisor-key': process.env.SUPERVISOR_API_KEY ?? '' };
  }

  async start(tenantId: string, payload: HermesStartPayload): Promise<void> {
    await this.call('start', tenantId, payload);
  }

  async stop(tenantId: string): Promise<void> {
    await this.call('stop', tenantId, {});
  }

  private async call(
    action: 'start' | 'stop',
    tenantId: string,
    body: unknown,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/hermes/${tenantId}/${action}`, body, {
          headers: this.headers(),
          timeout: 60_000,
        }),
      );
    } catch (err) {
      this.logger.error(
        `[hermes-agent] supervisor ${action} failed for tenant ${tenantId}: ${(err as Error).message}`,
      );
      throw new HermesAgentUnavailableError(
        `supervisor ${action} failed: ${(err as Error).message}`,
      );
    }
  }
}
