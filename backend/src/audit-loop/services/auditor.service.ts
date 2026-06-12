import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  AuditRubric,
  AuditScore,
  AuditFinding,
} from '../entities/audit-loop.entity';

import { PromptEngineService } from '../../prompt-engine/services/prompt-engine.service';
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Injectable()
export class AuditorService {
  private readonly logger = new Logger(AuditorService.name);

  constructor(
    @InjectRepository(AuditRubric)
    private readonly rubricRepo: Repository<AuditRubric>,
    @InjectRepository(AuditScore)
    private readonly scoreRepo: Repository<AuditScore>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    private readonly promptEngine: PromptEngineService,
  ) {}

  async auditArtifact(
    loopId: string,
    round: number,
    phase: string,
    content: any,
    tenantId?: string,
  ): Promise<{ overallScore: number; findings: Partial<AuditFinding>[] }> {
    const rubric = await this.rubricRepo.findOne({
      where: [
        { phase, tenantId, isActive: true },
        { phase, tenantId: IsNull(), isActive: true },
      ],
      order: { tenantId: 'DESC', version: 'DESC' },
    });

    if (!rubric) {
      this.logger.warn(
        `No active rubric found for phase ${phase}. Skipping audit with 10.0.`,
      );
      return { overallScore: 10.0, findings: [] };
    }

    // Step 1: nashsu/llm_wiki Two-Step CoT - Deep Analysis
    this.logger.log(
      `[Auditor] Starting phase 1 analysis for ${phase} (Loop: ${loopId}, Round: ${round})`,
    );

    const { text: analysis } = await generateText({
      model: google('gemini-2.5-pro'),
      prompt: `You are a Senior AI Auditor. Deeply analyze the following ${phase} artifact for technical correctness, security risks, and adherence to requirements.
      
      Artifact Content:
      ${JSON.stringify(content, null, 2)}
      
      Requirements & Context:
      - Phase: ${phase}
      - Round: ${round}
      
      Focus on identifying subtle logic flaws, edge cases, and architectural smells. Provide a detailed reasoning for each potential issue.`,
    });

    this.logger.debug(
      `[Auditor] Analysis complete. Starting scoring against ${rubric.criteria.length} criteria.`,
    );

    const findings: Partial<AuditFinding>[] = [];
    const scores: number[] = [];

    // Step 2: Scoring based on analysis
    for (const criterion of rubric.criteria) {
      const { object } = await generateObject({
        model: google('gemini-2.5-flash'), // Faster model for structured scoring
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
        prompt: `Based on the provided analysis, score the artifact against the criterion "${criterion.name}".
        
        Criterion Description: ${criterion.description}
        Scoring Rubric: ${criterion.scoringPrompt}
        
        Deep Analysis Reference:
        ${analysis}
        
        Artifact Content:
        ${JSON.stringify(content, null, 2)}
        
        Return a score from 0 to 10 and specific findings related ONLY to this criterion.`,
      });

      // Save score
      await this.scoreRepo.save({
        loopId,
        round,
        phase,
        criterion: criterion.name,
        score: object.score,
        auditorSpecialistId: 'felix', // Security Auditor / Auditor Persona
        rationale: object.rationale,
      });

      scores.push(object.score * (criterion.weight / 10));

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

    const totalWeight = rubric.criteria.reduce((a, b) => a + b.weight / 10, 0);
    const overallScore =
      totalWeight > 0 ? scores.reduce((a, b) => a + b, 0) / totalWeight : 10.0;

    this.logger.log(
      `[Auditor] Audit complete. Overall Score: ${overallScore.toFixed(2)}`,
    );

    return { overallScore, findings };
  }

  /**
   * Streaming Audit for Workflow Steps (Gap G)
   */
  async auditStreamingStep(
    loopId: string,
    round: number,
    stepKey: string,
    output: any,
    tenantId?: string,
  ): Promise<{ passed: boolean; finding?: Partial<AuditFinding> }> {
    this.logger.log(`[Auditor] Auditing streaming step: ${stepKey}`);

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        passed: z.boolean(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        reason: z.string(),
        suggestedFix: z.string().optional(),
      }),
      prompt: `Audit the output of workflow step "${stepKey}".
      
      Step Output:
      ${JSON.stringify(output, null, 2)}
      
      Is this output technically sound and safe? If it contains critical errors or hallucinated tools, mark as passed=false.`,
    });

    if (!object.passed) {
      const finding = {
        loopId,
        round,
        phase: 'execution_step',
        severity: object.severity || 'high',
        criterion: 'Step Correctness',
        evidence: object.reason,
        suggestedFix: object.suggestedFix,
      };

      await this.findingRepo.save(finding);
      return { passed: false, finding };
    }

    return { passed: true };
  }
}
