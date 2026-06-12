import { Injectable } from '@nestjs/common';
import { HermesAgentService } from '../../hermes-agent';
import { AdkSpecialistExecutor } from './adk-specialist.executor';
import { HermesAgentSpecialistExecutor } from './hermes-agent-specialist.executor';
import { LocalSpecialistExecutor } from './local-specialist.executor';
import type {
  SpecialistExecutor,
  SpecialistRunInput,
  SpecialistRunResult,
} from './specialist-executor.types';

const HERMES_TEAMS = ['research', 'general', 'coding'];

@Injectable()
export class RoutingSpecialistExecutor implements SpecialistExecutor {
  constructor(
    private readonly local: LocalSpecialistExecutor,
    private readonly adk: AdkSpecialistExecutor,
    private readonly hermes: HermesAgentSpecialistExecutor,
    private readonly hermesAgent: HermesAgentService,
  ) {}

  async run(input: SpecialistRunInput): Promise<SpecialistRunResult> {
    if (!(await this.shouldUseHermes(input))) {
      return process.env.SPECIALIST_BACKEND === 'adk'
        ? this.adk.run(input)
        : this.local.run(input);
    }

    const res = await this.hermes.run(input);
    const fallback =
      (process.env.HERMES_AGENT_FALLBACK_LOCAL ?? 'true') !== 'false';
    if (fallback && res.report.errorPatterns.includes('hermes_unavailable')) {
      return this.local.run(input);
    }
    return res;
  }

  private async shouldUseHermes(input: SpecialistRunInput): Promise<boolean> {
    const flag = process.env.SPECIALIST_BACKEND;
    if (flag === 'hermes') {
      return this.hermesAgent.isEnabledForTenant(input.tenantId);
    }
    if (flag !== 'auto') {
      return false;
    }
    return (
      HERMES_TEAMS.includes(input.team) &&
      (await this.hermesAgent.isEnabledForTenant(input.tenantId))
    );
  }
}
