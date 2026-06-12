import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class TypecheckEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'typecheck-evaluator';
  readonly supportedFlags = ['requiresTypecheckPass'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'tsc --noEmit exits 0 in sandbox';

  async evaluate(
    _req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const tscCalls = output.toolCalls.filter(
      (tc) =>
        typeof tc.name === 'string' &&
        (tc.name.includes('tsc') || tc.name.includes('typecheck')),
    );
    if (tscCalls.length === 0) {
      // Check raw output for TypeScript errors
      const hasErrors = /error TS\d+/i.test(output.rawOutput);
      return {
        satisfied: !hasErrors,
        evidence: { method: 'raw_output_scan', hasErrors },
        error: hasErrors ? 'TypeScript errors found in output' : undefined,
      };
    }
    const lastCall = tscCalls[tscCalls.length - 1];
    const resultStr =
      typeof lastCall.result === 'string'
        ? lastCall.result
        : JSON.stringify(lastCall.result);
    const passed =
      resultStr.includes('exit code: 0') || !/error TS\d+/i.test(resultStr);
    return {
      satisfied: passed,
      evidence: {
        tscToolCalls: tscCalls.length,
        lastResult: resultStr.substring(0, 500),
      },
      error: passed ? undefined : 'TypeScript compilation errors detected',
    };
  }
}
