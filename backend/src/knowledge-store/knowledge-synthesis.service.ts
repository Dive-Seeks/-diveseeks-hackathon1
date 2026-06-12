import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class KnowledgeSynthesisService {
  private readonly logger = new Logger(KnowledgeSynthesisService.name);

  constructor(private readonly aiRouter: AiProviderRouter) {}

  async synthesize(
    chunks: {
      id: string;
      content: string;
      sourceUrl: string;
      domain: string;
    }[],
  ): Promise<string> {
    if (chunks.length === 0) {
      return '';
    }

    const domain = chunks[0].domain || 'general';
    const model = this.aiRouter.getModel('researcher');

    const sourcesList = [...new Set(chunks.map((c) => c.sourceUrl))]
      .map((url, i) => `[${i + 1}] ${url}`)
      .join('\n');

    const chunksText = chunks
      .map(
        (c, i) =>
          `--- Chunk ${i + 1} (from [${[...new Set(chunks.map((ch) => ch.sourceUrl))].indexOf(c.sourceUrl) + 1}]) ---\n${c.content}`,
      )
      .join('\n\n');

    const system = `You are a knowledge wiki writer for Abigail, an AI business assistant.
Your job is to synthesize raw scraped web chunks into a dense, well-structured markdown wiki page.

Rules:
- Deduplicate overlapping facts — state each fact once
- Write in dense, factual prose — no filler, no padding
- Include source citations as footnotes: [1], [2], etc.
- Flag contradictions with a blockquote: > ⚠️ Contradiction: <description>
- Use ## headings to organise by sub-topic
- Output only the markdown content, no preamble`;

    const prompt = `Domain: ${domain}

Sources:
${sourcesList}

Raw chunks:
${chunksText}

Write a wiki page that synthesizes these chunks.`;

    try {
      const { text } = await generateText({
        model,
        system,
        prompt,
      });

      return text;
    } catch (error) {
      this.logger.error(
        `LLM call failed for domain ${domain}: ${error.message}`,
      );
      return '';
    }
  }
}
