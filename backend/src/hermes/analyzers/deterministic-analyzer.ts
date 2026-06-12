import { SignalEventDto } from '../dto/signal-event.dto';
import {
  SignalType,
  SignalWeight,
} from '../entities/user-behavior-signal.entity';
import { TopicHasher } from './topic-hasher';
import { SimilarityScorer } from './similarity-scorer';

export interface AnalysisResult {
  signalType: SignalType;
  weight: SignalWeight;
  topicHash: string | null;
  metadata: Record<string, unknown>;
  isSoftFlag: boolean;
}

const SIMILARITY_THRESHOLD = parseFloat(
  process.env.HERMES_SIMILARITY_THRESHOLD ?? '0.85',
);

export class DeterministicAnalyzer {
  private readonly hasher = new TopicHasher();
  private readonly scorer = new SimilarityScorer();

  analyze(
    event: SignalEventDto,
    recentEvents: SignalEventDto[],
  ): AnalysisResult {
    if (event.type === 'tab_hidden' || event.type === 'tab_visible') {
      return {
        signalType: 'tab_switch',
        weight: 'LOW',
        topicHash: null,
        metadata: {},
        isSoftFlag: false,
      };
    }

    if (event.type === 'rapid_send') {
      return {
        signalType: 'rapid_send',
        weight: 'MEDIUM',
        topicHash: null,
        metadata: {},
        isSoftFlag: true,
      };
    }

    const msg = event.message ?? '';

    if (msg.length < 15 && msg.length > 0) {
      const upperCount = (msg.match(/[A-Z]/g) ?? []).length;
      const letterCount = (msg.match(/[a-zA-Z]/g) ?? []).length;
      const capsRatio = letterCount > 0 ? upperCount / letterCount : 0;
      if (capsRatio >= 0.5) {
        return {
          signalType: 'angry_burst',
          weight: 'MEDIUM',
          topicHash: null,
          metadata: { capsRatio },
          isSoftFlag: true,
        };
      }
    }

    const recentMessages = recentEvents
      .filter((e) => e.type === 'message_sent' && e.message)
      .slice(-3);

    for (const prev of recentMessages) {
      const sim = this.scorer.score(msg, prev.message ?? '');
      if (sim >= SIMILARITY_THRESHOLD) {
        const topicHash = this.hasher.hash(msg);
        return {
          signalType: 'rephrase',
          weight: 'HIGH',
          topicHash,
          metadata: { similarity: sim },
          isSoftFlag: true,
        };
      }
    }

    const topicHash = msg.length > 0 ? this.hasher.hash(msg) : null;
    return {
      signalType: 'message_sent',
      weight: 'LOW',
      topicHash,
      metadata: {},
      isSoftFlag: false,
    };
  }
}
