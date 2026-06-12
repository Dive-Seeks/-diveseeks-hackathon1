import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserChatMessage } from './entities/user-chat-message.entity';

export interface PersistChatDto {
  tenantId: string;
  projectId: string;
  userId: string;
  team: 'coding' | 'general' | 'research';
  role: 'user' | 'assistant';
  content: string;
  specialistId?: string;
  sessionId?: string;
  tokenCount?: number;
}

@Injectable()
export class UserChatService {
  private readonly logger = new Logger(UserChatService.name);

  constructor(
    @InjectRepository(UserChatMessage)
    private readonly repo: Repository<UserChatMessage>,
  ) {}

  async persist(dto: PersistChatDto): Promise<void> {
    try {
      const msg = this.repo.create({
        tenantId: dto.tenantId,
        projectId: dto.projectId,
        userId: dto.userId,
        team: dto.team,
        role: dto.role,
        content: dto.content,
        specialistId: dto.specialistId,
        sessionId: dto.sessionId,
        tokenCount: dto.tokenCount ?? 0,
      });
      await this.repo.save(msg);
    } catch (err) {
      this.logger.error(
        `[UserChatService] persist failed tenant=${dto.tenantId} project=${dto.projectId}: ${(err as Error).message}`,
      );
    }
  }

  async getHistory(
    projectId: string,
    tenantId: string,
    limit = 50,
  ): Promise<UserChatMessage[]> {
    return this.repo.find({
      where: { tenantId, projectId },
      order: { createdAt: 'ASC' },
      take: Math.min(limit, 200),
    });
  }

  async getUndreamed(
    userId: string,
    tenantId: string,
    since: Date,
  ): Promise<UserChatMessage[]> {
    return this.repo
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId AND m.userId = :userId', {
        tenantId,
        userId,
      })
      .andWhere('m.dreamedAt IS NULL')
      .andWhere('m.createdAt >= :since', { since })
      .orderBy('m.createdAt', 'ASC')
      .getMany();
  }

  async markDreamed(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.repo.update({ id: In(ids) }, { dreamedAt: new Date() });
  }
}
