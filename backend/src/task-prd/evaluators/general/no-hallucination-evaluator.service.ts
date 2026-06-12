import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class NoHallucinationEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'no-hallucination-evaluator';
  readonly supportedFlags = ['requiresNoHallucination'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'Factual claims trace to episodic or company knowledge';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // V1: structural check — output references tool calls or sources
    const hasToolCallEvidence = output.toolCalls.length > 0;
    const hasCitations =
      /\[(\d+)\]/.test(output.rawOutput) || output.rawOutput.includes('http');
    const satisfied = hasToolCallEvidence || hasCitations;
    return {
      satisfied,
      evidence: {
        hasToolCallEvidence,
        hasCitations,
        method: 'structural_check',
      },
      error: satisfied ? undefined : 'No traceable sources found in output',
    };
  }
}
