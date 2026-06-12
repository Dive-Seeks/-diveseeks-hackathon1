import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class PeerReviewedEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'peer-reviewed-evaluator';
  readonly supportedFlags = ['requiresPeerReviewed'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 2000;
  readonly description = 'Sources in peer-reviewed venues (Crossref/PubMed)';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi;
    const dois = [...output.rawOutput.matchAll(doiPattern)].map((m) => m[0]);
    const hasPeerReviewed = dois.length > 0;
    return {
      satisfied: hasPeerReviewed,
      evidence: { doisFound: dois.length, method: 'doi_presence_heuristic' },
      error: hasPeerReviewed
        ? undefined
        : 'No DOIs found — peer-reviewed status cannot be verified',
    };
  }
}
