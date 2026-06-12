import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DegradedOutput } from './entities/degraded-output.entity';

export interface DegradedCheckInput {
  tenantId: string;
  specialistId: string;
  taskSessionId: string | null;
  modelUsed: string;
  output: string;
  confidence: number;
  taskRequiresCode: boolean;
}

export interface DegradedCheckResult {
  flagged: boolean;
  layer: number | null;
  reason: string | null;
  outputId: string | null;
}

const BOILERPLATE_PATTERNS = [
  /I don't have enough context to/i,
  /I'm not sure about this/i,
  /As an AI language model/i,
  /I cannot help with/i,
];

@Injectable()
export class DegradedReasoningService {
  private readonly logger = new Logger(DegradedReasoningService.name);
  private readonly CONFIDENCE_THRESHOLD = 0.4;

  constructor(
    @InjectRepository(DegradedOutput)
    private readonly degradedRepo: Repository<DegradedOutput>,
  ) {}

  async check(input: DegradedCheckInput): Promise<DegradedCheckResult> {
    // Layer 1: Self-confidence check
    if (input.confidence < this.CONFIDENCE_THRESHOLD) {
      const outputId = await this.persist(
        input,
        1,
        `Confidence ${input.confidence.toFixed(2)} below threshold ${this.CONFIDENCE_THRESHOLD}`,
      );
      return { flagged: true, layer: 1, reason: 'low_confidence', outputId };
    }

    // Layer 2: Output quality heuristics
    const heuristicReason = this.checkHeuristics(input);
    if (heuristicReason) {
      const outputId = await this.persist(input, 2, heuristicReason);
      return { flagged: true, layer: 2, reason: heuristicReason, outputId };
    }

    return { flagged: false, layer: null, reason: null, outputId: null };
  }

  async markEscalated(outputId: string): Promise<void> {
    await this.degradedRepo.update(outputId, { escalated: true });
  }

  private checkHeuristics(input: DegradedCheckInput): string | null {
    if (input.taskRequiresCode && !input.output.includes('```')) {
      return 'task_requires_code_no_code_block';
    }

    if (input.output.trim().length < 50) {
      return 'output_too_short';
    }

    for (const pattern of BOILERPLATE_PATTERNS) {
      if (pattern.test(input.output)) {
        return 'boilerplate_detected';
      }
    }

    return null;
  }

  private async persist(
    input: DegradedCheckInput,
    layer: number,
    reason: string,
  ): Promise<string> {
    const record = await this.degradedRepo.save({
      tenantId: input.tenantId,
      taskSessionId: input.taskSessionId,
      specialistId: input.specialistId,
      modelUsed: input.modelUsed,
      detectionLayer: layer,
      reason,
      escalated: false,
    });
    this.logger.warn(
      `[DegradedReasoning] Layer ${layer} flag: ${input.specialistId} — ${reason}`,
    );
    return record.id;
  }
}
