import { Injectable, Optional } from '@nestjs/common';
import {
  AgentHook,
  AgentHookContext,
  HookPoint,
} from '../agent-hook.interface';
import { DisciplineScorerService } from '../../../abigail/discipline-scorer.service';

@Injectable()
export class DisciplineScorerHook implements AgentHook {
  readonly name = 'discipline-scorer';
  readonly hookPoints: HookPoint[] = ['afterLLMResponse'];
  readonly priority = 50;

  constructor(@Optional() private readonly scorer?: DisciplineScorerService) {}

  async run(_point: HookPoint, ctx: AgentHookContext): Promise<void> {
    if (!this.scorer) return;
    const result = (ctx.metadata.result as string) ?? '';
    const files = (ctx.metadata.files as any) ?? [];
    if (!result) return;
    const report = this.scorer.score({
      result,
      files,
      specialist: ctx.specialist,
    } as any);
    ctx.metadata.disciplineReport = report;
  }
}
