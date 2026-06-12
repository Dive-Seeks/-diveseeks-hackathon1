import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { ManagerDecision } from './base-manager.service';

@Injectable()
export class CmoManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewAdStrategy(
    specialistOutput: unknown,
    issueTitle: string,
  ): Promise<ManagerDecision> {
    return this.review('cmo', specialistOutput, issueTitle);
  }
}
