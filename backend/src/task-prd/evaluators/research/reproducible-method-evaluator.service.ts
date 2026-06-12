import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class ReproducibleMethodEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'reproducible-method-evaluator';
  readonly supportedFlags = ['requiresReproducibleMethod'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Method has enough detail to reproduce';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const lower = output.rawOutput.toLowerCase();
    const indicators = {
      hasParameters:
        /\b(parameter|config|setting|threshold|n\s*=\s*\d)\b/i.test(lower),
      hasDataset: /\b(dataset|data set|corpus|sample)\b/i.test(lower),
      hasCode:
        /\b(github|repository|code|script|notebook)\b/i.test(lower) ||
        output.rawOutput.includes('```'),
      hasSteps: /\b(step \d|first|then|finally|procedure|method)\b/i.test(
        lower,
      ),
    };
    const score = Object.values(indicators).filter(Boolean).length;
    const satisfied = score >= 2;
    return {
      satisfied,
      evidence: { ...indicators, score, threshold: 2 },
      error: satisfied
        ? undefined
        : `Reproducibility score ${score}/4 — needs at least 2`,
    };
  }
}
