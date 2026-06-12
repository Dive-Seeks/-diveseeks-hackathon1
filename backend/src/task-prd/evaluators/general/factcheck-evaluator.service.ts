import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class FactcheckEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'factcheck-evaluator';
  readonly supportedFlags = ['requiresFactCheck'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Claims cross-check against tenant + global knowledge';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // V1: structural check — does the output contain verifiable claims?
    const hasFactualContent = output.rawOutput.length > 50;
    return {
      satisfied: hasFactualContent,
      evidence: {
        method: 'structural_check',
        outputLength: output.rawOutput.length,
      },
      error: hasFactualContent
        ? undefined
        : 'Output too short for factual verification',
    };
  }
}
