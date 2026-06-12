import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  AuditRubric,
  AuditScore,
  AuditFinding,
  AuditPhase,
} from '../entities/audit-loop.entity';
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Injectable()
export class FinalAuditorService {
  private readonly logger = new Logger(FinalAuditorService.name);

  constructor(
    @InjectRepository(AuditRubric)
    private readonly rubricRepo: Repository<AuditRubric>,
    @InjectRepository(AuditScore)
    private readonly scoreRepo: Repository<AuditScore>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
  ) {}

  async auditFinal(
    loopId: string,
    round: number,
    deliverable: any,
    tenantId?: string,
  ): Promise<{ overallScore: number; findings: Partial<AuditFinding>[] }> {
    const phase = AuditPhase.FINAL_AUDIT;

    // In a real system, we'd run 3 parallel LLM calls with different personas (Felix, Sage, Kai)
    // For this implementation, we'll use a single high-quality call that combines these personas.

    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        securityScore: z.number().min(0).max(10),
        testScore: z.number().min(0).max(10),
        reviewScore: z.number().min(0).max(10),
        findings: z.array(
          z.object({
            category: z.enum(['security', 'test', 'quality']),
            severity: z.enum(['low', 'medium', 'high', 'critical']),
            criterion: z.string(),
            evidence: z.string(),
            suggestedFix: z.string(),
          }),
        ),
      }),
      prompt: `You are a Multi-Agent Final Review Panel (Felix, Sage, Kai). 
      Perform the final ship gate audit for the following deliverable.
      
      Deliverable:
      ${JSON.stringify(deliverable, null, 2)}
      
      - Felix (Security): Check for OWASP leaks, secret exposure, injection.
      - Sage (Test): Check for coverage, edge cases, error handling.
      - Kai (Review): Check for clean code, vision alignment, maintainability.`,
    });

    const findings: Partial<AuditFinding>[] = object.findings.map((f) => ({
      loopId,
      round,
      phase,
      severity: f.severity,
      criterion: `Final ${f.category}: ${f.criterion}`,
      evidence: f.evidence,
      suggestedFix: f.suggestedFix,
    }));

    // Aggregate score = min of all three dimensions (10/10 required)
    const overallScore = Math.min(
      object.securityScore,
      object.testScore,
      object.reviewScore,
    );

    this.logger.log(
      `[FinalAuditor] Loop: ${loopId} | Final Score: ${overallScore}`,
    );

    return { overallScore, findings };
  }
}
