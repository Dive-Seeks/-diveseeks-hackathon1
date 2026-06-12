import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class LengthRangeEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'length-range-evaluator';
  readonly supportedFlags = ['requiresLengthRange'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Word count within [min, max]';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const wordCount = output.rawOutput.split(/\s+/).filter(Boolean).length;
    const min = (req.flags.min as number) ?? 0;
    const max = (req.flags.max as number) ?? Infinity;
    const satisfied = wordCount >= min && wordCount <= max;
    return {
      satisfied,
      evidence: { wordCount, min, max },
      error: satisfied
        ? undefined
        : `Word count ${wordCount} outside range [${min}, ${max}]`,
    };
  }
}
