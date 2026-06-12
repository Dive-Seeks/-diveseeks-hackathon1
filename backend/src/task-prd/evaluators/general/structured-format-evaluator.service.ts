import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class StructuredFormatEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'structured-format-evaluator';
  readonly supportedFlags = ['requiresStructuredFormat'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Output parses as valid JSON/Markdown/etc';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const format =
      ((req.flags.requiresStructuredFormat as any)?.format as string) ??
      (req.flags.format as string) ??
      'json';
    let satisfied = false;
    let error: string | undefined;

    switch (format.toLowerCase()) {
      case 'json':
        try {
          JSON.parse(output.rawOutput);
          satisfied = true;
        } catch (e) {
          error = `Invalid JSON: ${(e as Error).message}`;
        }
        break;
      case 'markdown':
        satisfied =
          output.rawOutput.includes('#') || output.rawOutput.includes('- ');
        error = satisfied ? undefined : 'No markdown structure detected';
        break;
      default:
        satisfied = output.rawOutput.length > 0;
        break;
    }

    return {
      satisfied,
      evidence: { format, outputLength: output.rawOutput.length },
      error,
    };
  }
}
