import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LocalSpecialistExecutor } from './local-specialist.executor';
import type {
  SpecialistExecutor,
  SpecialistRunInput,
  SpecialistRunResult,
} from './specialist-executor.types';

@Injectable()
export class AdkSpecialistExecutor implements SpecialistExecutor {
  private readonly logger = new Logger(AdkSpecialistExecutor.name);
  private readonly agentUrl = process.env.ADK_AGENT_URL ?? '';
  private readonly timeoutMs = Number(
    process.env.ADK_AGENT_TIMEOUT_MS ?? 120000,
  );

  constructor(
    private readonly http: HttpService,
    private readonly local: LocalSpecialistExecutor,
  ) {}

  async run(input: SpecialistRunInput): Promise<SpecialistRunResult> {
    try {
      const resp = await firstValueFrom(
        this.http.post(
          `${this.agentUrl}/run`,
          {
            specialist: input.specialist,
            team: input.team,
            isCoding: input.isCoding,
            userId: input.userId,
            tenantId: input.tenantId,
            sessionId: input.runSessionId,
            task:
              (input.session as any).taskDescription ??
              (input.session as any).description ??
              '',
          },
          { timeout: this.timeoutMs },
        ),
      );
      const body = resp?.data;
      if (!body || typeof body.result !== 'string' || !body.report) {
        throw new Error('malformed ADK response');
      }
      return {
        result: body.result,
        report: { ...body.report, executorBackend: 'adk' as const },
      };
    } catch (err) {
      this.logger.warn(
        `[adk-specialist] falling back to local: ${(err as Error).message}`,
      );
      return this.local.run(input);
    }
  }
}
