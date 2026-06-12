import { Injectable, Logger } from '@nestjs/common';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel, RerankingModel } from 'ai';
import { EVOLVE_MODELS } from './ai-models.constants';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  RerankingModelV3,
  RerankingModelV3CallOptions,
} from '@ai-sdk/provider';

class CohereRerankModel implements RerankingModelV3 {
  readonly specificationVersion = 'v3';
  readonly modelId = 'rerank-multilingual-v3.0';
  readonly provider = 'cohere-manual';

  async doRerank(options: RerankingModelV3CallOptions) {
    const docs = options.documents.values.map((d) =>
      typeof d === 'string' ? d : JSON.stringify(d),
    );
    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        query: options.query,
        documents: docs,
        top_n: options.topN,
      }),
    });
    const data = await response.json();
    if (!data.results) {
      throw new Error(`Cohere API error: ${JSON.stringify(data)}`);
    }
    return {
      ranking: data.results.map((r: any) => ({
        index: r.index,
        score: r.relevance_score,
      })),
    };
  }
}

export type AiTaskType =
  | 'chat' // Abigail narration + conversational turns
  | 'specialist' // Zara/Marco/Kai/Rex/Sage generateObject calls
  | 'researcher' // ResearcherAgent — complex reasoning, large context
  | 'compaction' // Session compaction summarisation
  | 'promotion' // Gene promotion validation (Jos)
  | 'synthesis'; // TenantContext synthesis — post-approval brain update

export type EvolveTier =
  | 'weak'
  | 'strong'
  | 'judge'
  | 'analyzer'
  | 'implementer';

@Injectable()
export class AiProviderRouter {
  private readonly logger = new Logger(AiProviderRouter.name);

  private readonly deepseekFlash: LanguageModel;
  private readonly deepseekPro: LanguageModel;
  private readonly geminiFallback: LanguageModel;
  private readonly openrouterRerank: RerankingModel;

  private readonly evolveModels: Record<EvolveTier, LanguageModel>;

  constructor() {
    const deepseek = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    const google = createGoogleGenerativeAI({
      apiKey:
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    this.deepseekFlash = deepseek('deepseek-chat'); // V4-Flash
    this.deepseekPro = deepseek('deepseek-reasoner'); // V4-Pro (complex reasoning)
    this.geminiFallback = google('gemini-2.5-flash');
    this.openrouterRerank = new CohereRerankModel();

    this.evolveModels = {
      weak: google(EVOLVE_MODELS.WEAK_SOLVER),
      strong: google(EVOLVE_MODELS.STRONG_SOLVER),
      judge: google(EVOLVE_MODELS.JUDGE),
      analyzer: google(EVOLVE_MODELS.ANALYZER),
      implementer: google(EVOLVE_MODELS.IMPLEMENTER),
    };
  }

  /**
   * Returns the appropriate model for a given task type.
   * Falls back to Gemini if DeepSeek key is missing (dev/test environments).
   */
  getModel(task: AiTaskType): LanguageModel {
    const dsKey = process.env.DEEPSEEK_API_KEY;
    if (!dsKey || dsKey.startsWith('your_')) {
      this.logger.warn(
        `DEEPSEEK_API_KEY not configured — falling back to Gemini for task: ${task}`,
      );
      return this.geminiFallback;
    }

    switch (task) {
      case 'researcher':
        return this.deepseekPro;
      case 'chat':
      case 'specialist':
      case 'compaction':
      case 'promotion':
      case 'synthesis':
      default:
        return this.deepseekFlash;
    }
  }

  /**
   * Called when a DeepSeek call fails with 429 or 503.
   * Returns the Gemini fallback model for one retry attempt.
   */
  getFallbackModel(): LanguageModel {
    this.logger.warn('DeepSeek rate limit/unavailable — using Gemini fallback');
    return this.geminiFallback;
  }

  /**
   * Returns the appropriate concrete model for Evolve evaluation harness.
   */
  getEvolveModel(tier: EvolveTier): LanguageModel {
    return this.evolveModels[tier];
  }

  /**
   * Returns the reranking model.
   */
  getRerankModel(): RerankingModel {
    return this.openrouterRerank;
  }
}
