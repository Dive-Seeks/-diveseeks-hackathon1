import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class InventorySupplyChainManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewInventoryOps(
    output: unknown,
    title: string,
    constraints?: unknown,
  ) {
    return this.review('inventory_supply_chain', output, title, constraints);
  }
}
