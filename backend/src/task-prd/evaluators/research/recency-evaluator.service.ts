import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class RecencyEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'recency-evaluator';
  readonly supportedFlags = ['requiresRecency'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Sources within configurable max age';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const maxAgeYears = (req.flags.maxAgeYears as number) ?? 5;
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - maxAgeYears;
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const years = [...output.rawOutput.matchAll(yearPattern)].map((m) =>
      parseInt(m[0], 10),
    );
    const citationYears = years.filter((y) => y >= 1900 && y <= currentYear);
    const recentYears = citationYears.filter((y) => y >= minYear);
    const satisfied = recentYears.length > 0;
    return {
      satisfied,
      evidence: {
        maxAgeYears,
        minYear,
        citationYears: [...new Set(citationYears)],
        recentCount: recentYears.length,
      },
      error: satisfied ? undefined : `No citations from ${minYear} or later`,
    };
  }
}
