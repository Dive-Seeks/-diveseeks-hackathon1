import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  VexOutputSchema,
  VexOutput,
  VexTemplateFallback,
} from './schemas/vex.schema';
import { TenantContext } from '../common/soul/soul-engine.service';
import { SeoOutput } from './schemas/seo.schema';

@Injectable()
export class VexService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    sageOutput: SeoOutput,
    lastCompact?: string,
  ): Promise<VexOutput> {
    const sageContext = `Sage's rewrite output to validate:\n${JSON.stringify(sageOutput, null, 2)}`;
    const compact = lastCompact
      ? `${sageContext}\n\n${lastCompact}`
      : sageContext;
    return this.factory.run<VexOutput>({
      issueId,
      agentId: `${agentId}-vex`,
      tenantId,
      tenantContext,
      outputSchema: VexOutputSchema,
      templateFallback: VexTemplateFallback,
      lastCompact: compact,
    });
  }
}
