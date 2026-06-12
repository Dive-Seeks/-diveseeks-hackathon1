import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

const PRIMARY_DOMAINS = [
  'nature.com',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'cell.com',
  'pnas.org',
  'science.org',
  'thelancet.com',
  'nejm.org',
  'bmj.com',
  'pubmed.ncbi.nlm.nih.gov',
  'arxiv.org',
];

@Injectable()
export class PrimarySourceEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'primary-source-evaluator';
  readonly supportedFlags = ['requiresPrimarySource'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 1000;
  readonly description = 'At least one source is primary literature';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const urlPattern = /https?:\/\/[^\s)]+/g;
    const urls = [...output.rawOutput.matchAll(urlPattern)].map((m) => m[0]);
    const primaryUrls = urls.filter((url) =>
      PRIMARY_DOMAINS.some((d) => url.includes(d)),
    );
    const satisfied = primaryUrls.length > 0;
    return {
      satisfied,
      evidence: {
        totalUrls: urls.length,
        primaryUrls,
        primaryDomains: PRIMARY_DOMAINS,
      },
      error: satisfied ? undefined : 'No primary source URLs found',
    };
  }
}
