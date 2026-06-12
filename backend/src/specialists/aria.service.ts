import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  CopyOutputSchema,
  CopyOutput,
  CopyTemplateFallback,
} from './schemas/copy.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class AriaService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<CopyOutput> {
    return this.factory.run<CopyOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: CopyOutputSchema,
      templateFallback: CopyTemplateFallback,
      lastCompact,
    });
  }
}
