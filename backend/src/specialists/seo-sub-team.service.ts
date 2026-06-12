import { Injectable, Logger } from '@nestjs/common';
import { OrionService } from './orion.service';
import { SageService } from './sage.service';
import { VexService } from './vex.service';
import { OrionOutput } from './schemas/orion.schema';
import { SeoOutput } from './schemas/seo.schema';
import { VexOutput } from './schemas/vex.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

export interface SeoSubTeamResult {
  orionOutput: OrionOutput;
  sageOutput: SeoOutput;
  vexOutput: VexOutput;
  approved: boolean;
}

@Injectable()
export class SeoSubTeamService {
  private readonly logger = new Logger(SeoSubTeamService.name);

  constructor(
    private readonly orion: OrionService,
    private readonly sage: SageService,
    private readonly vex: VexService,
  ) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<SeoSubTeamResult> {
    // Step 1 — Orion plans the strategy
    const orionOutput = await this.orion.run(
      issueId,
      agentId,
      tenantId,
      tenantContext,
      lastCompact,
    );
    this.logger.log(
      `Orion complete: ${orionOutput.keywordTargets.length} targets, summary="${orionOutput.roadmapSummary.slice(0, 60)}…"`,
    );

    const orionContext = `SEO strategy from Orion:\n${JSON.stringify(orionOutput, null, 2)}`;
    const sageCompact = lastCompact
      ? `${orionContext}\n\n${lastCompact}`
      : orionContext;

    // Step 2 — Sage rewrites/optimises based on Orion's plan
    let sageOutput = await this.sage.run(
      issueId,
      agentId,
      tenantId,
      tenantContext,
      sageCompact,
    );
    this.logger.log(`Sage complete: score=${sageOutput.score}`);

    // Step 3 — Vex validates Sage's output
    let vexOutput = await this.vex.run(
      issueId,
      agentId,
      tenantId,
      tenantContext,
      sageOutput,
      lastCompact,
    );
    this.logger.log(
      `Vex complete: approved=${vexOutput.approved}, score=${vexOutput.overallScore}`,
    );

    // Step 4 — Retry Sage once if Vex blocks with specific blockers
    if (!vexOutput.approved && vexOutput.blockers.length > 0) {
      this.logger.log(
        `Vex blocked — retrying Sage with blockers: ${vexOutput.blockers.join('; ')}`,
      );
      const retryCompact = `${sageCompact}\n\nVex blockers to address in retry:\n${vexOutput.blockers.map((b) => `- ${b}`).join('\n')}`;
      sageOutput = await this.sage.run(
        issueId,
        agentId,
        tenantId,
        tenantContext,
        retryCompact,
      );
      vexOutput = await this.vex.run(
        issueId,
        agentId,
        tenantId,
        tenantContext,
        sageOutput,
        lastCompact,
      );
      this.logger.log(
        `Vex re-check: approved=${vexOutput.approved}, score=${vexOutput.overallScore}`,
      );
    }

    return { orionOutput, sageOutput, vexOutput, approved: vexOutput.approved };
  }
}
