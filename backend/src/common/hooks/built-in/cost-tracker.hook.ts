import { Injectable, Optional } from '@nestjs/common';
import {
  AgentHook,
  AgentHookContext,
  HookPoint,
} from '../agent-hook.interface';
import { BudgetService } from '../../../coordinator/budget.service';

@Injectable()
export class CostTrackerHook implements AgentHook {
  readonly name = 'cost-tracker';
  readonly hookPoints: HookPoint[] = ['afterLLMResponse'];
  readonly priority = 10;

  constructor(@Optional() private readonly budgetService?: BudgetService) {}

  async run(_point: HookPoint, ctx: AgentHookContext): Promise<void> {
    if (!this.budgetService) return;
    const inputTokens = (ctx.metadata.inputTokens as number) ?? 0;
    const outputTokens = (ctx.metadata.outputTokens as number) ?? 0;
    if (inputTokens === 0 && outputTokens === 0) return;
    await this.budgetService.recordSpend(ctx.tenantId, {
      sessionId: ctx.sessionId,
      provider: (ctx.metadata.provider as string) ?? 'unknown',
      model: (ctx.metadata.model as string) ?? 'unknown',
      inputTokens,
      outputTokens,
    });
  }
}
