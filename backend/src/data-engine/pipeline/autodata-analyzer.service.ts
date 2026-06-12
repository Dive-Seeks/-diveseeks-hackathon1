import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ParsedDocument, DocumentSection } from './document-parser.service';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

const ExtractionSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string().min(10).max(500),
      domain: z.enum([
        'pricing',
        'sop',
        'brand',
        'product',
        'hr',
        'policy',
        'other',
      ]),
      source_quote: z.string().max(200).optional(),
      entity_refs: z.array(z.string()).max(5),
    }),
  ),
});

const VerifierSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
});

export interface AnalyzedClaim {
  claim: string;
  confidence: number;
  sourcePage: number;
  sourceQuote: string;
  domain: string;
  entityRefs: string[];
}

@Injectable()
export class AutodataAnalyzerService {
  private readonly logger = new Logger(AutodataAnalyzerService.name);
  private readonly MAX_CYCLES = 3;
  private readonly MIN_GAP = 0.2;
  private readonly WEAK_MAX = 0.65;
  private readonly STRONG_MIN = 0.6;

  constructor(private readonly aiRouter: AiProviderRouter) {}

  async analyze(doc: ParsedDocument): Promise<AnalyzedClaim[]> {
    const allClaims: AnalyzedClaim[] = [];
    for (const section of doc.sections) {
      const sectionClaims = await this.analyzeSection(section, doc.filename);
      allClaims.push(...sectionClaims);
    }
    return allClaims;
  }

  private async analyzeSection(
    section: DocumentSection,
    filename: string,
  ): Promise<AnalyzedClaim[]> {
    if (section.content.trim().length < 20) return [];

    let feedback = '';
    for (let cycle = 0; cycle < this.MAX_CYCLES; cycle++) {
      const extraction = await this.runChallenger(section, filename, feedback);
      if (extraction.claims.length === 0) return [];

      const testQuestion = `Based only on this excerpt, what are the key rules or facts? Excerpt: "${section.content.substring(0, 500)}..."`;
      const [weakScore, strongScore] = await Promise.all([
        this.runVerifier(
          'weak',
          testQuestion,
          extraction.claims.map((c) => c.claim).join('\n'),
        ),
        this.runVerifier('strong', testQuestion, section.content),
      ]);

      const gap = strongScore - weakScore;
      this.logger.debug(
        `Cycle ${cycle + 1}: weak=${weakScore.toFixed(2)} strong=${strongScore.toFixed(2)} gap=${gap.toFixed(2)}`,
      );

      if (
        weakScore <= this.WEAK_MAX &&
        strongScore >= this.STRONG_MIN &&
        gap >= this.MIN_GAP
      ) {
        return extraction.claims.map((c) => ({
          claim: c.claim,
          confidence: gap,
          sourcePage: section.index,
          sourceQuote: c.source_quote ?? section.content.substring(0, 150),
          domain: c.domain,
          entityRefs: c.entity_refs,
        }));
      }

      if (gap < this.MIN_GAP) {
        feedback = `Claims were too easy — weak solver scored ${weakScore.toFixed(2)}. Generate more specific, technical claims that require domain knowledge to answer.`;
      } else {
        feedback = `Strong solver failed (${strongScore.toFixed(2)}). Ensure claims are actually supported by the document.`;
      }
    }
    return [];
  }

  private async runChallenger(
    section: DocumentSection,
    filename: string,
    feedback: string,
  ) {
    const { object } = await generateObject({
      model: this.aiRouter.getModel(AI_TASKS.RESEARCHER),
      schema: ExtractionSchema,
      system: `You are a knowledge extraction specialist. Extract factual claims, rules, policies, and decisions from business documents. Every claim must be directly supported by the source text. Include a verbatim source_quote (max 200 chars). ${feedback ? `Previous feedback: ${feedback}` : ''}`,
      prompt: `Document: "${filename}" — Section: "${section.label}"\n\nContent:\n${section.content.substring(0, 3000)}`,
    });
    return object;
  }

  private async runVerifier(
    mode: 'weak' | 'strong',
    question: string,
    context: string,
  ): Promise<number> {
    const model =
      mode === 'weak'
        ? this.aiRouter.getModel(AI_TASKS.FAST)
        : this.aiRouter.getModel(AI_TASKS.RESEARCHER);

    const { object } = await generateObject({
      model,
      schema: VerifierSchema,
      system: `You are a verifier. Score 0.0–1.0 how well the context answers the question. 1.0 = fully answers, 0.0 = cannot answer.`,
      prompt: `Question: ${question}\n\nContext:\n${context.substring(0, 2000)}`,
    });
    return object.score;
  }
}
