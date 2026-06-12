import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class StatisticalRigorEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'statistical-rigor-evaluator';
  readonly supportedFlags = ['requiresStatRigor'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Quantitative claims have p/CI/effect size';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const indicators = {
      hasPValue: /p\s*[<>]\s*0\.\d+/i.test(output.rawOutput),
      hasCI: /95%\s+CI|confidence\s+interval/i.test(output.rawOutput),
      hasEffectSize:
        /Cohen'?s\s+d|effect\s+size|odds\s+ratio|hazard\s+ratio/i.test(
          output.rawOutput,
        ),
      hasNValue: /n\s*=\s*\d+/i.test(output.rawOutput),
    };
    const score = Object.values(indicators).filter(Boolean).length;
    const satisfied = score >= 1;
    return {
      satisfied,
      evidence: { ...indicators, score },
      error: satisfied ? undefined : 'No statistical rigor indicators found',
    };
  }
}
