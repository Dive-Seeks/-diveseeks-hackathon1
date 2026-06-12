import { Injectable, Logger } from '@nestjs/common';
import { BrainIntentType } from './entities/brain-session.entity';
import { generateText } from 'ai';
import { AiProviderRouter } from '../common/ai-provider-router.service';

type ClassifiedType = BrainIntentType | 'conversational' | 'query' | 'bugfix';
const VALID_TYPES: ClassifiedType[] = [
  'conversational',
  'query',
  'bugfix',
  'feature',
  'architecture',
  'design',
  'new_module',
];
const IDEATION_TYPES: ClassifiedType[] = [
  'feature',
  'architecture',
  'design',
  'new_module',
];

@Injectable()
export class BrainIntentClassifierService {
  private readonly logger = new Logger(BrainIntentClassifierService.name);

  constructor(private readonly aiRouter: AiProviderRouter) {}

  // Checked in order: new_module before feature so "new module" phrases don't fall into feature's "new" keyword.
  private readonly keywordSignals: [BrainIntentType, string[]][] = [
    ['new_module', ['new module', 'new service', 'new endpoint', 'new page']],
    ['feature', ['build', 'create', 'add feature', 'new']],
    ['architecture', ['architecture', 'structure']],
    ['design', ['how should we', 'what approach', 'plan', 'spec']],
  ];

  // Bug keywords checked before query keywords — must remain first in classify().
  private readonly bugKeywords = ['fix', 'bug', 'error', 'broken', 'crash'];
  private readonly queryKeywords = [
    'show',
    'list',
    'status',
    'what is',
    'how many',
    'get',
  ];

  async classify(
    message: string,
  ): Promise<{ type: ClassifiedType; requiresIdeation: boolean }> {
    const lower = message.toLowerCase();

    // Tier 1 — zero LLM cost. Bug check runs before query check (no overlap between lists).
    for (const kw of this.bugKeywords) {
      if (lower.includes(kw))
        return { type: 'bugfix', requiresIdeation: false };
    }
    for (const kw of this.queryKeywords) {
      if (lower.includes(kw)) return { type: 'query', requiresIdeation: false };
    }
    for (const [type, keywords] of this.keywordSignals) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return { type, requiresIdeation: true };
      }
    }

    // Tier 2 — Gemini Flash for ambiguous messages that match no Tier 1 keyword.
    // Uses AiProviderRouter (DeepSeek primary, Gemini fallback) — no Anthropic key needed.
    try {
      const { text } = await generateText({
        model: this.aiRouter.getModel('chat'),
        maxOutputTokens: 10,
        prompt: `Classify this developer message into exactly one word from this list: conversational | query | bugfix | feature | architecture | design | new_module\n\nMessage: "${message}"\n\nReturn only the single category word, nothing else.`,
      });
      const classification = text.trim().toLowerCase() as ClassifiedType;
      if (VALID_TYPES.includes(classification)) {
        return {
          type: classification,
          requiresIdeation: IDEATION_TYPES.includes(classification),
        };
      }
    } catch (err) {
      this.logger.warn(
        'Tier 2 intent classification failed, defaulting to conversational',
        err,
      );
    }

    return { type: 'conversational', requiresIdeation: false };
  }
}
