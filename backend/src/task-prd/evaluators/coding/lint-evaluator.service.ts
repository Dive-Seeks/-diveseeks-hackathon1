import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class LintEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'lint-evaluator';
  readonly supportedFlags = ['requiresLintPass'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'ESLint exits 0 on changed files';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const lintCalls = output.toolCalls.filter(
      (tc) =>
        typeof tc.name === 'string' &&
        (tc.name.includes('lint') || tc.name.includes('eslint')),
    );
    if (lintCalls.length === 0) {
      return {
        satisfied: true,
        evidence: { method: 'no_lint_call', assumed: true },
      };
    }
    const lastCall = lintCalls[lintCalls.length - 1];
    const resultStr =
      typeof lastCall.result === 'string'
        ? lastCall.result
        : JSON.stringify(lastCall.result);
    const hasErrors = /\d+ error/i.test(resultStr);
    return {
      satisfied: !hasErrors,
      evidence: {
        lintToolCalls: lintCalls.length,
        lastResult: resultStr.substring(0, 500),
      },
      error: hasErrors ? 'ESLint errors detected' : undefined,
    };
  }
}
