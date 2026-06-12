import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  EmailSmsOutputSchema,
  EmailSmsOutput,
  EmailSmsTemplateFallback,
} from './schemas/email-sms.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class EmberService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<EmailSmsOutput> {
    return this.factory.run<EmailSmsOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: EmailSmsOutputSchema,
      templateFallback: EmailSmsTemplateFallback,
      lastCompact,
    });
  }
}
