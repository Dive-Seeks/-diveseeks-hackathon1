import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class DomWatcherEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'dom-watcher-evaluator';
  readonly supportedFlags = [
    'requiresCdpWatch',
    'requiresAttrWatch',
    'requiresNetworkAssert',
  ];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description =
    'CDP/MutationObserver/network events match (absorbs Sage qa/)';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const flags = req.flags;
    const evidence: Record<string, unknown> = {};
    let satisfied = true;

    if (flags.requiresCdpWatch) {
      const hasCdpEvents = output.toolCalls.some(
        (tc) => typeof tc.name === 'string' && tc.name.includes('cdp'),
      );
      evidence.cdpWatch = { found: hasCdpEvents };
      if (!hasCdpEvents) satisfied = false;
    }

    if (flags.requiresAttrWatch) {
      const hasAttrChanges = output.toolCalls.some(
        (tc) => typeof tc.name === 'string' && tc.name.includes('mutation'),
      );
      evidence.attrWatch = { found: hasAttrChanges };
      if (!hasAttrChanges) satisfied = false;
    }

    if (flags.requiresNetworkAssert) {
      const hasNetworkAssert = output.toolCalls.some(
        (tc) =>
          typeof tc.name === 'string' &&
          (tc.name.includes('network') || tc.name.includes('route')),
      );
      evidence.networkAssert = { found: hasNetworkAssert };
      if (!hasNetworkAssert) satisfied = false;
    }

    return {
      satisfied,
      evidence,
      error: satisfied ? undefined : 'DOM watcher assertions not met',
    };
  }
}
