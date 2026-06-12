import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class ToneEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'tone-evaluator';
  readonly supportedFlags = ['requiresTone'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Output matches requested tone via classifier';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const requestedTone = (req.flags.tone as string) ?? 'professional';
    // V1: heuristic tone check
    const lower = output.rawOutput.toLowerCase();
    let detected = 'neutral';
    if (lower.includes('!') && lower.includes('exciting'))
      detected = 'enthusiastic';
    else if (lower.includes('dear') || lower.includes('sincerely'))
      detected = 'formal';
    else if (/\b(we|our|us)\b/.test(lower)) detected = 'professional';
    const satisfied = detected === requestedTone || requestedTone === 'any';
    return {
      satisfied,
      evidence: { requestedTone, detectedTone: detected },
      error: satisfied
        ? undefined
        : `Tone mismatch: wanted '${requestedTone}', got '${detected}'`,
    };
  }
}
