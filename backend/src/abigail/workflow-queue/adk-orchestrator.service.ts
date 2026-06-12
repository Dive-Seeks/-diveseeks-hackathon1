import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleAuth } from 'google-auth-library';
import { WorkflowOrchestrator } from './workflow-orchestrator.interface';
import {
  AgentRunJobData,
  AgentSessionJobData,
  QueueUnavailableError,
} from './workflow-queue.constants';

@Injectable()
export class AdkOrchestrator implements WorkflowOrchestrator {
  private readonly logger = new Logger(AdkOrchestrator.name);
  private readonly engine = process.env.ADK_REASONING_ENGINE ?? '';

  private readonly auth: GoogleAuth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  constructor(private readonly http: HttpService) {}

  private async tokenHeader(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async startRun(data: AgentRunJobData): Promise<string> {
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/${this.engine}:streamQuery`;
      const resp = await firstValueFrom(
        this.http.post(
          url,
          { class_method: 'async_stream_query', input: data },
          { headers: await this.tokenHeader() },
        ),
      );
      return (resp?.data?.runId as string) ?? data.runId;
    } catch (err) {
      this.logger.error(
        `[AdkOrchestrator] startRun failed: ${(err as Error).message}`,
      );
      throw new QueueUnavailableError();
    }
  }

  async startSession(data: AgentSessionJobData): Promise<void> {
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/${this.engine}:streamQuery`;
      await firstValueFrom(
        this.http.post(
          url,
          { class_method: 'async_stream_query', input: data },
          { headers: await this.tokenHeader() },
        ),
      );
    } catch (err) {
      this.logger.error(
        `[AdkOrchestrator] startSession failed: ${(err as Error).message}`,
      );
      throw new QueueUnavailableError();
    }
  }

  async resumeRun(dto: {
    runId: string;
    sessionId: string;
    approved: boolean;
    note?: string;
  }): Promise<void> {
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/${this.engine}:streamQuery`;
      await firstValueFrom(
        this.http.post(
          url,
          { class_method: 'resume', input: dto },
          { headers: await this.tokenHeader() },
        ),
      );
    } catch (err) {
      this.logger.error(
        `[AdkOrchestrator] resumeRun failed: ${(err as Error).message}`,
      );
      throw new QueueUnavailableError();
    }
  }
}
