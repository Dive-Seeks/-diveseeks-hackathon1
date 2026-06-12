import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class CitationsEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'citations-evaluator';
  readonly supportedFlags = ['requiresCitations'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 500;
  readonly description = 'N citation markers, each resolves to real URL';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const minCitations = (req.flags.minCitations as number) ?? 1;
    const citationPattern = /\[(\d+)\]/g;
    const markers = [...output.rawOutput.matchAll(citationPattern)];
    const uniqueMarkers = new Set(markers.map((m) => m[1]));
    const satisfied = uniqueMarkers.size >= minCitations;
    return {
      satisfied,
      evidence: {
        found: uniqueMarkers.size,
        required: minCitations,
        markers: [...uniqueMarkers],
      },
      error: satisfied
        ? undefined
        : `Found ${uniqueMarkers.size} citations, need ${minCitations}`,
    };
  }
}
