import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class HumanCodeReviewEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'human-code-review-evaluator';
  readonly supportedFlags = ['requiresHumanReview'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Human approves via REVIEW CARD';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const changeSummary =
      output.files.length > 0
        ? `Changed files: ${output.files.join(', ')}`
        : 'No file changes detected';
    return {
      satisfied: false,
      evidence: { reason: 'Awaiting human code review', changeSummary },
      requiresHumanApproval: true,
      humanInstruction: `${req.text}\n\n${changeSummary}`,
    };
  }
}
