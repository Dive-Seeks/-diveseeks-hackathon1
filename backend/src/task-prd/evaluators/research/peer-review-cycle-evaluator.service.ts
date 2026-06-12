import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class PeerReviewCycleEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'peer-review-cycle-evaluator';
  readonly supportedFlags = ['requiresPeerVerification'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Peer research specialist reviews output';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // V1: automatically satisfied if output has sufficient structure
    const hasStructure =
      output.rawOutput.length > 200 && output.toolCalls.length > 0;
    return {
      satisfied: hasStructure,
      evidence: {
        outputLength: output.rawOutput.length,
        toolCallCount: output.toolCalls.length,
        method: 'structural_check',
      },
      error: hasStructure
        ? undefined
        : 'Output lacks sufficient structure for peer review pass',
    };
  }
}
