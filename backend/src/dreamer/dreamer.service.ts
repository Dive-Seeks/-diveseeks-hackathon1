import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DreamerRun } from './entities/dreamer-run.entity';
import { DreamerReflectionService } from './dreamer-reflection.service';
import { DreamerPreferencesService } from './dreamer-preferences.service';
import { UserChatService } from '../chat/user-chat.service';
import { UserChatMessage } from '../chat/entities/user-chat-message.entity';

const MIN_TURNS = 4;
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class DreamerService {
  private readonly logger = new Logger(DreamerService.name);

  constructor(
    private readonly userChat: UserChatService,
    private readonly reflection: DreamerReflectionService,
    private readonly preferences: DreamerPreferencesService,
    @InjectRepository(DreamerRun)
    private readonly runRepo: Repository<DreamerRun>,
  ) {}

  async dream(tenantId: string, userId: string): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const turns = await this.userChat.getUndreamed(userId, tenantId, since);

    if (turns.length < MIN_TURNS) {
      this.logger.log(
        `[Dreamer] Skipping tenant=${tenantId} user=${userId} — only ${turns.length} turns (min ${MIN_TURNS})`,
      );
      await this.saveRun(tenantId, userId, 0, 0, 'skipped');
      return;
    }

    const sessions = this.groupIntoSessions(turns);
    let extracted = 0;

    for (const session of sessions) {
      try {
        const sessionText = this.reflection.serialiseSession(
          session.map((t) => ({ role: t.role, content: t.content })),
        );
        const result = await this.reflection.reflect(sessionText);
        for (const pref of result.preferences) {
          await this.preferences.upsert(tenantId, userId, pref);
          extracted++;
        }
      } catch (err) {
        this.logger.warn(
          `[Dreamer] Session reflection failed: ${(err as Error).message}`,
        );
      }
    }

    await this.userChat.markDreamed(turns.map((t) => t.id));
    await this.saveRun(tenantId, userId, turns.length, extracted, 'success');
    this.logger.log(
      `[Dreamer] Done tenant=${tenantId} user=${userId} turns=${turns.length} preferences=${extracted}`,
    );

    // Phase 5 — reconcile near-duplicate preference rows created across past sessions
    try {
      await this.preferences.reconcile(userId, tenantId);
    } catch (err) {
      this.logger.warn(
        `[Dreamer] reconcile failed (non-fatal): ${(err as Error).message}`,
      );
    }
  }

  private groupIntoSessions(turns: UserChatMessage[]): UserChatMessage[][] {
    if (!turns.length) return [];
    const sessions: UserChatMessage[][] = [];
    let current: UserChatMessage[] = [turns[0]];

    for (let i = 1; i < turns.length; i++) {
      const gap =
        turns[i].createdAt.getTime() - turns[i - 1].createdAt.getTime();
      if (gap > SESSION_GAP_MS) {
        sessions.push(current);
        current = [];
      }
      current.push(turns[i]);
    }
    if (current.length) sessions.push(current);
    return sessions;
  }

  private async saveRun(
    tenantId: string,
    userId: string,
    turnsProcessed: number,
    preferencesExtracted: number,
    status: 'success' | 'failed' | 'skipped',
  ): Promise<void> {
    await this.runRepo.save(
      this.runRepo.create({
        tenantId,
        userId,
        turnsProcessed,
        preferencesExtracted,
        status,
      }),
    );
  }
}
