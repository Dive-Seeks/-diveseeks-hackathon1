import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class HumanResearchApprovalEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'human-research-approval-evaluator';
  readonly supportedFlags = ['requiresHumanApproval'];
  readonly team = 'research' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Human approves research output via REVIEW CARD';

  async evaluate(
    req: PrdRequirement,
    _output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    return {
      satisfied: false,
      evidence: { reason: 'Awaiting human research approval' },
      requiresHumanApproval: true,
      humanInstruction: req.text,
    };
  }
}
