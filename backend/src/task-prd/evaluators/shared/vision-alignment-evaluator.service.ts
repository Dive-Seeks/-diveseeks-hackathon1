import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class VisionAlignmentEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'vision-alignment-evaluator';
  readonly supportedFlags = ['requiresVisionAlignment'];
  readonly team = 'all' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'Output respects vision constraints and forbidden tech stack';

  async evaluate(
    requirement: PrdRequirement,
    output: SpecialistOutput,
    ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const violations: string[] = [];
    const forbidden = ctx.vision?.techStack?.forbidden ?? [];

    for (const file of output.artefacts) {
      for (const f of forbidden) {
        const lower = file.content.toLowerCase();
        const fLower = f.toLowerCase();
        if (
          lower.includes(`from '${fLower}'`) ||
          lower.includes(`from "${fLower}"`) ||
          lower.includes(`require('${fLower}')`) ||
          lower.includes(`require("${fLower}")`)
        ) {
          violations.push(`File ${file.path} imports forbidden '${f}'`);
        }
      }
    }

    for (const constraint of ctx.vision?.constraints ?? []) {
      if (constraint.toLowerCase().includes('select *')) {
        for (const file of output.artefacts) {
          if (/SELECT\s+\*/i.test(file.content)) {
            violations.push(`SELECT * found in ${file.path}`);
          }
        }
      }
    }

    return {
      satisfied: violations.length === 0,
      evidence: {
        constraintsChecked: (ctx.vision?.constraints ?? []).length,
        forbiddenChecked: forbidden.length,
        violations,
      },
      error:
        violations.length > 0
          ? `Vision violations: ${violations.join('; ')}`
          : undefined,
    };
  }
}
