import { Injectable, Logger } from '@nestjs/common';
import { DataEngineContextService } from './data-engine-context.service';

export interface RankedKnowledge {
  content: string;
  source: string;
  trustScore: number;
}

const CHARS_PER_TOKEN = 4;

@Injectable()
export class UnifiedKnowledgeService {
  private readonly logger = new Logger(UnifiedKnowledgeService.name);

  constructor(private readonly dataEngineContext: DataEngineContextService) {}

  async getUnifiedKnowledge(
    tenantId: string,
    query: string,
    maxTokens: number = 2000,
  ): Promise<string> {
    this.logger.log(
      `[Knowledge] Fetching unified knowledge for tenant ${tenantId}`,
    );

    const [wikiResults, webResults] = await Promise.all([
      this.dataEngineContext.getWikiResults(tenantId, query),
      this.dataEngineContext.getWebResults(tenantId, query),
    ]);

    const ranked: RankedKnowledge[] = [
      ...wikiResults.map((r) => ({
        content: r.content,
        source: 'Company Wiki',
        trustScore: 1.0,
      })),
      ...webResults.map((r) => ({
        content: r.content,
        source: r.isSynthesized ? 'Synthesized Web' : 'Raw Web Chunk',
        trustScore: r.isSynthesized ? 0.7 : 0.4,
      })),
    ];

    ranked.sort((a, b) => b.trustScore - a.trustScore);

    const unique = this.deduplicate(ranked);
    const fitted = this.fitToTokenBudget(unique, maxTokens);

    return this.format(fitted);
  }

  private fitToTokenBudget(
    results: RankedKnowledge[],
    maxTokens: number,
  ): RankedKnowledge[] {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    let total = 0;
    const out: RankedKnowledge[] = [];
    for (const r of results) {
      if (total + r.content.length > maxChars) break;
      total += r.content.length;
      out.push(r);
    }
    return out;
  }

  private deduplicate(results: RankedKnowledge[]): RankedKnowledge[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const fingerprint = r.content
        .substring(0, 100)
        .toLowerCase()
        .replace(/\W/g, '');
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  }

  private format(results: RankedKnowledge[]): string {
    if (results.length === 0) return 'No relevant knowledge found.';
    return results
      .map(
        (r) =>
          `--- SOURCE: ${r.source} (Trust: ${r.trustScore}) ---\n${r.content}\n---`,
      )
      .join('\n\n');
  }
}
