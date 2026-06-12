import { Injectable, Optional } from '@nestjs/common';
import {
  AgentHook,
  AgentHookContext,
  HookPoint,
} from '../agent-hook.interface';
import { HermesService } from '../../../hermes/hermes.service';

@Injectable()
export class HermesObserverHook implements AgentHook {
  readonly name = 'hermes-observer';
  readonly hookPoints: HookPoint[] = ['beforeDispatch', 'onError'];
  readonly priority = 30;

  constructor(@Optional() private readonly hermesService?: HermesService) {}

  async run(point: HookPoint, ctx: AgentHookContext): Promise<void> {
    if (!this.hermesService) return;
    const userId = (ctx.metadata.userId as string) ?? '';
    if (!userId) return;
    if (point === 'onError') {
      await (this.hermesService as any).recordSignal(
        ctx.tenantId,
        userId,
        'error',
        {
          specialist: ctx.specialist,
          errorMessage:
            (ctx.metadata.errorMessage as string) ?? 'unknown error',
        },
      );
    }
  }
}
