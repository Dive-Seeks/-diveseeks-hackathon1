import { Injectable, Optional } from '@nestjs/common';
import {
  AgentHook,
  AgentHookContext,
  HookPoint,
} from '../agent-hook.interface';
import { SessionBridgeService } from '../../../memory/session-bridge.service';

@Injectable()
export class MemoryBridgeHook implements AgentHook {
  readonly name = 'memory-bridge';
  readonly hookPoints: HookPoint[] = ['afterDispatch'];
  readonly priority = 20;

  constructor(
    @Optional() private readonly sessionBridge?: SessionBridgeService,
  ) {}

  async run(_point: HookPoint, ctx: AgentHookContext): Promise<void> {
    if (!this.sessionBridge) return;
    const result = (ctx.metadata.result as string) ?? '';
    if (!result) return;
    await this.sessionBridge.bridge(ctx.tenantId, ctx.team, ctx.specialist, {
      activeTask: ctx.taskDescription.substring(0, 200),
      constraintsAndPreferences: result.substring(0, 300),
      keyDecisions: '',
    });
  }
}
