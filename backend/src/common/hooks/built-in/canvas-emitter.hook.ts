import { Injectable, Optional } from '@nestjs/common';
import {
  AgentHook,
  AgentHookContext,
  HookPoint,
} from '../agent-hook.interface';
import { SalesGateway } from '../../../gateways/sales/sales.gateway';

@Injectable()
export class CanvasEmitterHook implements AgentHook {
  readonly name = 'canvas-emitter';
  readonly hookPoints: HookPoint[] = ['beforeAgentRun', 'afterAgentRun'];
  readonly priority = 5;

  constructor(@Optional() private readonly salesGateway?: SalesGateway) {}

  async run(point: HookPoint, ctx: AgentHookContext): Promise<void> {
    if (!this.salesGateway) return;
    const projectId = (ctx.metadata.projectId as string) ?? ctx.tenantId;
    const emit = (payload: object) =>
      this.salesGateway!.emitProjectFeedUpdate(projectId, {
        type: 'agent_message',
        projectId,
        ...payload,
      });

    if (point === 'beforeAgentRun') {
      emit({
        fromAgent: 'abigail-mind',
        interactionType: 'job_started',
        content: `Starting: ${ctx.taskDescription.substring(0, 100)}`,
      });
      emit({
        fromAgent: 'abigail-mind',
        interactionType: 'delegation_request',
        content: `Delegating to ${ctx.specialist}: ${ctx.taskDescription.substring(0, 80)}`,
      });
    } else {
      emit({
        fromAgent: ctx.specialist,
        interactionType: 'job_completed',
        content: `Completed: ${ctx.taskDescription.substring(0, 100)}`,
      });
      emit({
        fromAgent: 'abigail-mind',
        interactionType: 'job_completed',
        content: `Completed: ${ctx.taskDescription.substring(0, 100)}`,
      });
    }
  }
}
