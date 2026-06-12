import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class HumanTextApprovalEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'human-text-approval-evaluator';
  readonly supportedFlags = ['requiresHumanApproval'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Human approves text output via REVIEW CARD';

  async evaluate(
    req: PrdRequirement,
    _output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    return {
      satisfied: false,
      evidence: { reason: 'Awaiting human text approval' },
      requiresHumanApproval: true,
      humanInstruction: req.text,
    };
  }
}
