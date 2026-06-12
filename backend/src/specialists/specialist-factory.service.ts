import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { ZodSchema } from 'zod';
import { HeartbeatService } from '../heartbeat/heartbeat.service';
import { ActivityService } from '../activity/activity.service';
import { TenantContext } from '../common/soul/soul-engine.service';

export interface SpecialistRunInput<T> {
  issueId: string;
  agentId: string;
  tenantId: string;
  tenantContext: TenantContext;
  outputSchema: ZodSchema<T>;
  templateFallback: T;
  lastCompact?: string;
}

@Injectable()
export class SpecialistFactoryService {
  private readonly logger = new Logger(SpecialistFactoryService.name);

  constructor(
    private readonly heartbeat: HeartbeatService,
    private readonly activity: ActivityService,
  ) {}

  async run<T>(input: SpecialistRunInput<T>): Promise<T> {
    this.logger.log(
      `Specialist run: agent=${input.agentId}, issue=${input.issueId}`,
    );

    const output = await this.heartbeat.dispatch<T>({
      issueId: input.issueId,
      agentId: input.agentId,
      tenantId: input.tenantId,
      tenantContext: input.tenantContext,
      outputSchema: input.outputSchema,
      templateFallback: input.templateFallback,
      lastCompact: input.lastCompact,
    });

    return output;
  }
}
