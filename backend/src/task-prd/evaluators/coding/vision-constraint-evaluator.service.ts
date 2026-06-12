import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class VisionConstraintEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'vision-constraint-evaluator';
  readonly supportedFlags = ['requiresVisionAlignment'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Changed code respects vision.constraints[]';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const violations: string[] = [];
    const forbidden = ctx.vision?.techStack?.forbidden ?? [];

    for (const file of output.artefacts) {
      for (const f of forbidden) {
        if (
          file.content.toLowerCase().includes(`from '${f.toLowerCase()}'`) ||
          file.content.toLowerCase().includes(`require('${f.toLowerCase()}')`)
        ) {
          violations.push(`File ${file.path} imports forbidden '${f}'`);
        }
      }
    }

    return {
      satisfied: violations.length === 0,
      evidence: {
        constraintsChecked: (ctx.vision?.constraints ?? []).length,
        violations,
      },
      error:
        violations.length > 0
          ? `Vision violations: ${violations.join('; ')}`
          : undefined,
    };
  }
}
