import { Injectable } from '@nestjs/common';
import porter2Stem from 'wink-porter2-stemmer';
import {
  IEvidenceEvaluator,
  EvaluationResult,
  EvaluationContext,
  SpecialistOutput,
} from '../../interfaces/evidence-evaluator.interface';
import { PrdRequirement } from '../../interfaces/prd-base.interface';

@Injectable()
export class CoverageEvaluatorService implements IEvidenceEvaluator {
  readonly evaluatorId = 'coverage-evaluator';
  readonly supportedFlags = ['requiresCoverage'];
  readonly team = 'general' as const;
  readonly betweenIterationDelayMs = 0;
  readonly description = 'All required topics from PRD addressed';

  async evaluate(
    req: PrdRequirement,
    output: SpecialistOutput,
    _ctx: EvaluationContext,
  ): Promise<EvaluationResult> {
    const topics =
      ((req.flags.requiresCoverage as any)?.topics as string[]) ??
      (req.flags.topics as string[]) ??
      this.extractTopics(req.text);
    const normalizedOutput = this.normalize(output.rawOutput);
    const covered = topics.filter((t) =>
      this.isTopicCovered(t, normalizedOutput),
    );
    const missing = topics.filter((t) => !covered.includes(t));
    const satisfied = missing.length === 0;
    return {
      satisfied,
      evidence: { totalTopics: topics.length, covered, missing },
      error: satisfied ? undefined : `Missing topics: ${missing.join(', ')}`,
    };
  }

  private isTopicCovered(topic: string, normalizedOutput: string): boolean {
    const normalizedTopic = this.normalize(topic);
    if (!normalizedTopic) return true;
    if (normalizedOutput.includes(normalizedTopic)) return true;

    const topicTokens = this.tokenize(topic);
    if (topicTokens.length === 0) return true;

    const matchedTokens = topicTokens.filter((token) =>
      normalizedOutput.includes(token),
    );

    if (topicTokens.length === 1) {
      return matchedTokens.length === 1;
    }

    // Require at least ceil(n/2) tokens to match — more lenient than (n-1) for
    // 3+ token phrases where the specialist may use synonyms for the third word.
    return (
      matchedTokens.length >= Math.max(1, Math.ceil(topicTokens.length / 2))
    );
  }

  private extractTopics(text: string): string[] {
    // Extract keywords from requirement text as fallback
    return text
      .split(/[,;.]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);
  }

  private normalize(text: string): string {
    return this.tokenize(text).join(' ');
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => this.stem(token))
      .filter((token) => token.length > 2 && !this.isStopWord(token));
  }

  // Porter2 guarantees stem(singular) === stem(plural) — the previous hand-rolled
  // suffix rules mapped "milestones" -> "mileston" but "milestone" -> "milestone",
  // so plural-only documents could never cover a singular topic token.
  private stem(token: string): string {
    return porter2Stem(token);
  }

  private isStopWord(token: string): boolean {
    return new Set([
      // Core conjunctions / prepositions
      'the',
      'and',
      'for',
      'with',
      'that',
      'this',
      'from',
      'into',
      'your',
      'their',
      'must',
      'include',
      'list',
      'all',
      // Additional function words
      'are',
      'have',
      'has',
      'was',
      'were',
      'been',
      'each',
      'every',
      'its',
      'not',
      'nor',
      'but',
      'yet',
      'how',
      'what',
      'when',
      'where',
      'which',
      'who',
      'why',
      'about',
      'above',
      'between',
      'through',
      'during',
      'without',
      'before',
      'after',
      'while',
      'would',
      'could',
      'should',
      'such',
      'also',
      'both',
      'more',
      'most',
      'other',
      'some',
      'than',
      'then',
      'onli',
      'same',
      'veri',
      'just',
      'well',
      'where',
      'show',
      'show',
      // Porter2 stems for common PRD boilerplate words
      'output',
      'contain',
      'section',
      'document',
      'provid',
      'ensur',
      'clear',
      'explicitli',
      'state',
      'written',
      'write',
    ]).has(token);
  }
}
