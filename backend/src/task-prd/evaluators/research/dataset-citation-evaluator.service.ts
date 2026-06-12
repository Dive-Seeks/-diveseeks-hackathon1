import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class DatasetCitationEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'dataset-citation-evaluator';
  readonly supportedFlags = ['requiresDatasetCitation'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 500;
  readonly description = 'Datasets cited with accessible identifier';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const patterns = [
      /GSE\d+/g,
      /PRJNA\d+/g,
      /PRJEB\d+/g,
      /SRP\d+/g,
      /10\.\d{4,9}\/[^\s]+/g,
      /zenodo\.org\/record\/\d+/g,
      /kaggle\.com\/datasets?\/[^\s]+/g,
    ];
    const found: string[] = [];
    for (const p of patterns) {
      const matches = [...output.rawOutput.matchAll(p)].map((m) => m[0]);
      found.push(...matches);
    }
    const unique = [...new Set(found)];
    const satisfied = unique.length > 0;
    return {
      satisfied,
      evidence: { datasetIdentifiers: unique, count: unique.length },
      error: satisfied ? undefined : 'No dataset identifiers found',
    };
  }
}
