import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditFinding, AuditPhase } from '../entities/audit-loop.entity';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Injectable()
export class StreamAuditorService {
  private readonly logger = new Logger(StreamAuditorService.name);

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
  ) {}

  async auditStepOutput(
    loopId: string,
    round: number,
    stepKey: string,
    specialistId: string,
    output: any,
  ): Promise<{
    severity: 'low' | 'medium' | 'high' | 'critical' | 'none';
    finding?: Partial<AuditFinding>;
  }> {
    this.logger.debug(
      `[StreamAuditor] Auditing step: ${stepKey} from ${specialistId}`,
    );

    // Layer 1: Regex/Heuristic (Mocked for now)
    const hasHallucinatedTools =
      JSON.stringify(output).includes('__unknown_tool__');
    if (hasHallucinatedTools) {
      return this.reportFinding(
        loopId,
        round,
        stepKey,
        specialistId,
        'critical',
        'Hallucinated Tool Detected',
        'Output contains calls to non-existent tools.',
      );
    }

    // Layer 2: Schema Validation (Mocked)
    // Layer 3: Confidence Check (Mocked)

    // Layer 4: Selective LLM Critic
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        isValid: z.boolean(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        reason: z.string(),
        suggestedFix: z.string().optional(),
      }),
      prompt: `Audit the output of specialist "${specialistId}" for step "${stepKey}".
      
      Output:
      ${JSON.stringify(output, null, 2)}
      
      Look for: logic errors, security leaks, or total deviations from step goals.`,
    });

    if (!object.isValid) {
      return this.reportFinding(
        loopId,
        round,
        stepKey,
        specialistId,
        object.severity,
        'LLM Step Critique',
        object.reason,
        object.suggestedFix,
      );
    }

    return { severity: 'none' };
  }

  private async reportFinding(
    loopId: string,
    round: number,
    stepKey: string,
    specialistId: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    criterion: string,
    evidence: string,
    suggestedFix?: string,
  ) {
    const finding: Partial<AuditFinding> = {
      loopId,
      round,
      phase: 'executing',
      severity,
      criterion,
      evidence,
      suggestedFix: suggestedFix || 'Review step output and retry.',
      specialistId,
      stepKey,
    };

    await this.findingRepo.save(finding);
    return { severity, finding };
  }
}
