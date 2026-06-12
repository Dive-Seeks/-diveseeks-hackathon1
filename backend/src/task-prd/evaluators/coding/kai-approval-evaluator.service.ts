import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class KaiApprovalEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'kai-approval-evaluator';
  readonly supportedFlags = ['requiresKaiApproval'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'Kai specialist (read-only mode) returns no blocking comments';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    // In v1, Kai approval is assessed from the specialist output — specifically
    // looking for Kai's review comments in the tool calls or messages.
    const kaiMessages = output.messages.filter(
      (m) =>
        m.toLowerCase().includes('kai') || m.toLowerCase().includes('review'),
    );
    const hasBlockingComment = kaiMessages.some(
      (m) =>
        m.toLowerCase().includes('blocking') ||
        m.toLowerCase().includes('must fix'),
    );
    return {
      satisfied: !hasBlockingComment,
      evidence: { kaiMessages: kaiMessages.length, hasBlockingComment },
      error: hasBlockingComment
        ? 'Kai review found blocking comments'
        : undefined,
    };
  }
}
