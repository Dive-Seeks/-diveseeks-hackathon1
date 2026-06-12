import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { z } from 'zod';
import { AnalyzedClaim } from './autodata-analyzer.service';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

const QualityCheckSchema = z.object({
  passes: z.boolean(),
  contextLeaks: z.boolean(),
  rubricCoverage: z.number().min(0).max(1),
  questionQuality: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestions: z.array(z.string()).max(3),
});

export interface QualityCheckResult {
  passes: boolean;
  contextLeaks: boolean;
  rubricCoverage: number;
  questionQuality: number;
  reasoning: string;
  suggestions: string[];
}

/**
 * Quality Verifier Pre-Check Service
 *
 * Runs BEFORE sending to weak/strong solvers to prevent wasted API calls.
 * Implements Facebook Autodata's QV step:
 * 1. Context leakage detection — does the context contain the answer?
 * 2. Rubric coverage check — are criteria measurable and discriminating?
 * 3. Question quality check — is it answerable from the source?
 */
@Injectable()
export class QualityVerifierService {
  private readonly logger = new Logger(QualityVerifierService.name);
  private readonly MIN_QUALITY = 0.6;
  private readonly MIN_RUBRIC_COVERAGE = 0.5;

  constructor(private readonly aiRouter: AiProviderRouter) {}

  async verify(
    claims: AnalyzedClaim[],
    sectionContent: string,
  ): Promise<QualityCheckResult> {
    if (claims.length === 0) {
      return {
        passes: false,
        contextLeaks: false,
        rubricCoverage: 0,
        questionQuality: 0,
        reasoning: 'No claims to verify',
        suggestions: [],
      };
    }

    const claimsText = claims.map((c) => `- ${c.claim}`).join('\n');
    const testQuestion = `Based only on this excerpt, what are the key rules or facts? Excerpt: "${sectionContent.substring(0, 500)}..."`;

    const { object } = await generateObject({
      model: this.aiRouter.getModel(AI_TASKS.FAST),
      schema: QualityCheckSchema,
      system: `You are a quality verifier for an AI evaluation system. Your job is to check whether a set of extracted claims and a test question are suitable for weak-strong model evaluation.

Check for these failure modes:
1. CONTEXT LEAKAGE: Can someone answer the test question by simply rephrasing sentences from the claims? If the claims basically ARE the answer, the context leaks.
2. RUBRIC COVERAGE: Are the claims specific enough to be scored on a rubric? Vague claims like "the product is good" are not scorable.
3. QUESTION QUALITY: Is the test question answerable from the source material? Would a domain expert vs a generalist produce meaningfully different answers?`,
      prompt: `Claims extracted:
${claimsText}

Test question: ${testQuestion}

Source content (first 1000 chars):
${sectionContent.substring(0, 1000)}

Evaluate whether this claim set + question is suitable for weak-strong evaluation.`,
    });

    const passes =
      !object.contextLeaks &&
      object.rubricCoverage >= this.MIN_RUBRIC_COVERAGE &&
      object.questionQuality >= this.MIN_QUALITY;

    if (!passes) {
      this.logger.debug(
        `QV REJECT: leaks=${object.contextLeaks} rubric=${object.rubricCoverage.toFixed(2)} quality=${object.questionQuality.toFixed(2)} — ${object.reasoning.substring(0, 100)}`,
      );
    }

    return { ...object, passes };
  }
}
