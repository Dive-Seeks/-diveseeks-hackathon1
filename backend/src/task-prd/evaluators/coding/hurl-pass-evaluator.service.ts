import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class HurlPassEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'hurl-pass-evaluator';
  readonly supportedFlags = ['requiresHurlGreen'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Hurl file returns 2xx + assertions green';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const hurlCalls = output.toolCalls.filter(
      (tc) => typeof tc.name === 'string' && tc.name.includes('hurl'),
    );
    if (hurlCalls.length === 0) {
      return {
        satisfied: false,
        evidence: { reason: 'No hurl tool call found' },
        error: 'No hurl execution detected',
      };
    }
    const lastCall = hurlCalls[hurlCalls.length - 1];
    const resultStr =
      typeof lastCall.result === 'string'
        ? lastCall.result
        : JSON.stringify(lastCall.result);
    const passed =
      resultStr.includes('exit code: 0') || resultStr.includes('success');
    return {
      satisfied: passed,
      evidence: {
        hurlToolCalls: hurlCalls.length,
        lastResult: resultStr.substring(0, 500),
      },
      error: passed ? undefined : 'Hurl execution failed',
    };
  }
}
