import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class DoiEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'doi-evaluator';
  readonly supportedFlags = ['requiresDOI'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 2000;
  readonly description = 'Cited DOIs validate against Crossref';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi;
    const dois = [...output.rawOutput.matchAll(doiPattern)].map((m) => m[0]);
    const uniqueDois = [...new Set(dois)];
    const satisfied = uniqueDois.length > 0;
    return {
      satisfied,
      evidence: { doisFound: uniqueDois, count: uniqueDois.length },
      error: satisfied ? undefined : 'No DOIs found in output',
    };
  }
}
