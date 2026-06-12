import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class ContradictionCheckEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'contradiction-check-evaluator';
  readonly supportedFlags = ['requiresContradictionCheck'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Claims dont contradict wiki_pages / tenant_knowledge';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // V1: structural check — look for hedging language that suggests uncertainty
    const lower = output.rawOutput.toLowerCase();
    const contradictionIndicators = [
      'however, this contradicts',
      'in contrast to',
      'despite claiming',
      'erroneously',
    ];
    const found = contradictionIndicators.filter((i) => lower.includes(i));
    const satisfied = found.length === 0;
    return {
      satisfied,
      evidence: { contradictionIndicators: found, method: 'keyword_scan' },
      error: satisfied
        ? undefined
        : `Potential contradictions detected: ${found.join(', ')}`,
    };
  }
}
