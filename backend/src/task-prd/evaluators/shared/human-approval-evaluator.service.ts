import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class HumanApprovalEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'human-approval-evaluator';
  readonly supportedFlags = ['requiresHumanSignoff'];
  readonly team = 'all' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'Generic human sign-off — always gates on human approval';

  async evaluate(
    requirement: PrdRequirement,
    _output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    return {
      satisfied: false,
      evidence: { reason: 'Awaiting human sign-off' },
      requiresHumanApproval: true,
      humanInstruction: requirement.text,
    };
  }
}
