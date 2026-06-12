import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class TestPassEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'test-pass-evaluator';
  readonly supportedFlags = ['requiresTestPass'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Jest test file passes';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const jestCalls = output.toolCalls.filter(
      (tc) =>
        typeof tc.name === 'string' &&
        (tc.name.includes('jest') || tc.name.includes('test')),
    );
    if (jestCalls.length === 0) {
      return {
        satisfied: false,
        evidence: { reason: 'No jest/test tool call found' },
        error: 'No test execution detected',
      };
    }
    const lastCall = jestCalls[jestCalls.length - 1];
    const resultStr =
      typeof lastCall.result === 'string'
        ? lastCall.result
        : JSON.stringify(lastCall.result);
    const passed =
      /Tests:\s+\d+ passed/.test(resultStr) &&
      !/Tests:\s+\d+ failed/.test(resultStr);
    return {
      satisfied: passed,
      evidence: {
        testToolCalls: jestCalls.length,
        lastResult: resultStr.substring(0, 500),
      },
      error: passed ? undefined : 'Test execution reported failures',
    };
  }
}
