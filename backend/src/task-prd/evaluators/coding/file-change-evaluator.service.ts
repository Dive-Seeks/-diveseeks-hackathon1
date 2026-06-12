import { Injectable } from '@nestjs/common';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class FileChangeEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'file-change-evaluator';
  readonly supportedFlags = ['requiresFileChange'];
  readonly team = 'coding' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'Git diff shows expected file(s) changed';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const expectedPath = (req.flags.expectedPath as string) || '';
    const changedFiles = output.files ?? [];
    const satisfied = expectedPath
      ? changedFiles.some((f) => f.includes(expectedPath))
      : changedFiles.length > 0;
    return {
      satisfied,
      evidence: { expectedPath, changedFiles, matchFound: satisfied },
      error: satisfied
        ? undefined
        : `No file change detected${expectedPath ? ` for ${expectedPath}` : ''}`,
    };
  }
}
