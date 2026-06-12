import { Injectable, Logger } from '@nestjs/common';
import { IEvidenceEvaluator } from '../interfaces/evidence-evaluator.interface';

@Injectable()
export class EvaluatorRegistryService {
  private readonly logger = new Logger(EvaluatorRegistryService.name);
  private readonly evaluators = new Map<string, IEvidenceEvaluator>();

  register(evaluator: IEvidenceEvaluator): void {
    if (this.evaluators.has(evaluator.evaluatorId)) {
      throw new Error(`Duplicate evaluator ID: ${evaluator.evaluatorId}`);
    }
    this.evaluators.set(evaluator.evaluatorId, evaluator);
    this.logger.log(
      `Registered evaluator: ${evaluator.evaluatorId} (team: ${evaluator.team}, flags: ${evaluator.supportedFlags.join(',')})`,
    );
  }

  getById(evaluatorId: string): IEvidenceEvaluator | undefined {
    return this.evaluators.get(evaluatorId);
  }

  findByFlags(flagKeys: string[], team: string): IEvidenceEvaluator[] {
    const found: IEvidenceEvaluator[] = [];
    for (const e of this.evaluators.values()) {
      if (e.team !== 'all' && e.team !== team) continue;
      if (e.supportedFlags.some((f) => flagKeys.includes(f))) {
        found.push(e);
      }
    }
    return found;
  }

  maxDelayForFlags(flagKeys: string[], team: string): number {
    const matched = this.findByFlags(flagKeys, team);
    return matched.reduce(
      (max, e) => Math.max(max, e.betweenIterationDelayMs),
      0,
    );
  }

  listAll(): IEvidenceEvaluator[] {
    return Array.from(this.evaluators.values());
  }
}
