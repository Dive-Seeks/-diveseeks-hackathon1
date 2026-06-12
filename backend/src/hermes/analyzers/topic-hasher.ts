import { createHash } from 'crypto';

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'i',
  'you',
  'we',
  'they',
  'he',
  'she',
  'it',
  'my',
  'your',
  'our',
  'their',
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'that',
  'this',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'can',
]);

export class TopicHasher {
  hash(message: string): string {
    const normalized = message
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // strip punctuation
      .split(/\s+/)
      .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
      .sort() // order-independent
      .join(' ');

    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }
}
