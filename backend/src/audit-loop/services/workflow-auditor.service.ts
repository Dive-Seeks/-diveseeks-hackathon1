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
export class WorkflowAuditorService {
  private readonly logger = new Logger(WorkflowAuditorService.name);

  constructor(
    @InjectRepository(AuditRubric)
    private readonly rubricRepo: Repository<AuditRubric>,
    @InjectRepository(AuditScore)
    private readonly scoreRepo: Repository<AuditScore>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
  ) {}

  async auditWorkflow(
    loopId: string,
    round: number,
    content: any,
    tenantId?: string,
  ): Promise<{ overallScore: number; findings: Partial<AuditFinding>[] }> {
    const phase = AuditPhase.WORKFLOW_AUDIT;

    const rubric = await this.rubricRepo.findOne({
      where: [
        { phase, tenantId, isActive: true },
        { phase, tenantId: IsNull(), isActive: true },
      ],
      order: { tenantId: 'DESC', version: 'DESC' },
    });

    if (!rubric) {
      this.logger.warn(
        `No active rubric found for ${phase}. Skipping with 10.0.`,
      );
      return { overallScore: 10.0, findings: [] };
    }

    // Pattern 2: Two-Step CoT
    const { text: analysis } = await generateText({
      model: google('gemini-2.5-pro'),
      system:
        'You are Atlas, the DevOps & Workflow Architect. Your goal is to find cycle detection issues, parallel-safety violations, and saga compensation gaps.',
      prompt: `Deeply analyze the following workflow specification.
      
      Workflow Content:
      ${JSON.stringify(content, null, 2)}
      
      Identify missing compensation steps, retry hazards, timeout-realism issues, and dag-validity errors.`,
    });

    const findings: Partial<AuditFinding>[] = [];
    const rawScores: number[] = [];

    for (const criterion of rubric.criteria) {
      const { object } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: z.object({
          score: z.number().min(0).max(10),
          rationale: z.string(),
          flaggedIssues: z.array(
            z.object({
              severity: z.enum(['low', 'medium', 'high', 'critical']),
              evidence: z.string(),
              suggestedFix: z.string(),
            }),
          ),
        }),
        prompt: `Score the workflow against criterion "${criterion.name}".
        
        Description: ${criterion.description}
        Rubric: ${criterion.scoringPrompt}
        
        Reference Analysis:
        ${analysis}
        
        Workflow Content:
        ${JSON.stringify(content, null, 2)}`,
      });

      await this.scoreRepo.save({
        loopId,
        round,
        phase,
        criterion: criterion.name,
        score: object.score,
        auditorSpecialistId: 'atlas',
        rationale: object.rationale,
      });

      rawScores.push(object.score);

      for (const issue of object.flaggedIssues) {
        findings.push({
          loopId,
          round,
          phase,
          severity: issue.severity,
          criterion: criterion.name,
          evidence: issue.evidence,
          suggestedFix: issue.suggestedFix,
        });
      }
    }

    const overallScore = Math.min(...rawScores);

    this.logger.log(
      `[WorkflowAuditor] Loop: ${loopId} | Score: ${overallScore} | Findings: ${findings.length}`,
    );

    return { overallScore, findings };
  }
}
