import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSession } from './entities/task-session.entity';

export interface SessionSummary {
  outcome: 'done' | 'needs_review' | 'blocked';
  oneLiner: string;
  docSection: string;
  /** Which executor ran the task ('local' | 'adk' | 'hermes'), when recorded. */
  executorBackend?: string;
}

@Injectable()
export class SessionSummaryService {
  constructor(
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
  ) {}

  async getSummary(
    sessionId: string,
    taskTitle: string,
  ): Promise<SessionSummary> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      select: ['result', 'status', 'context'],
    });

    if (!session) {
      return this.blocked(taskTitle, 'Session not found.');
    }

    const executorBackend = (
      session.context as { executorBackend?: string } | null
    )?.executorBackend;

    let outcome = this.mapOutcome(session.status);
    const resultText = (session.result as string | null) ?? '';

    if (!resultText.trim()) {
      return this.blocked(taskTitle, 'No result recorded.');
    }

    // Upgrade to 'done' when the result indicates success but session.status was
    // downgraded by a post-dispatch hook (SpecKit audit, etc.).
    if (
      outcome !== 'done' &&
      (/status:\s*complete/i.test(resultText) ||
        /"outcome"\s*:\s*"success"/i.test(resultText))
    ) {
      outcome = 'done';
    }

    const oneLiner = this.extractOneLiner(resultText);
    const outcomeLabel =
      outcome === 'done'
        ? 'DONE'
        : outcome === 'needs_review'
          ? 'NEEDS REVIEW'
          : 'BLOCKED';
    const docSection =
      `### ${taskTitle}  [${outcomeLabel}]\n` + resultText.slice(0, 800);

    return { outcome, oneLiner, docSection, executorBackend };
  }

  private mapOutcome(status: string): 'done' | 'needs_review' | 'blocked' {
    if (status === 'done') return 'done';
    // 'review' is the legacy TaskSession status for needs_review (taskOutcomeToSessionStatus maps 'needs_review' → 'review')
    if (status === 'needs_review' || status === 'review') return 'needs_review';
    return 'blocked';
  }

  private extractOneLiner(text: string): string {
    const match = text.match(/[^.!?]*[.!?]/);
    const raw = match ? match[0].trim() : text.slice(0, 120).trim();
    return raw.length > 120 ? raw.slice(0, 117) + '…' : raw;
  }

  private blocked(taskTitle: string, reason: string): SessionSummary {
    return {
      outcome: 'blocked',
      oneLiner: reason,
      docSection: `### ${taskTitle}  [BLOCKED]\n${reason}`,
    };
  }
}
