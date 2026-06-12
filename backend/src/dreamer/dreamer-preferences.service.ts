import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { rerank } from 'ai';
import { UserPreference } from './entities/user-preference.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

export interface PrefInput {
  category: 'style' | 'fact' | 'frustration' | 'topic';
  key: string;
  value: string;
  confidence: number;
}

@Injectable()
export class DreamerPreferencesService {
  private readonly logger = new Logger(DreamerPreferencesService.name);

  constructor(
    @InjectRepository(UserPreference)
    private readonly repo: Repository<UserPreference>,
    private readonly vertexEmbed: VertexEmbeddingService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async upsert(
    tenantId: string,
    userId: string,
    pref: PrefInput,
  ): Promise<void> {
    const embedding = await this.vertexEmbed.embed(
      `${pref.key}: ${pref.value}`,
    );
    const vecString = `[${embedding.join(',')}]`;

    const existing = await this.repo
      .createQueryBuilder('p')
      .where(
        'p."tenantId" = :tenantId AND p."userId" = :userId AND p."archivedAt" IS NULL',
        { tenantId, userId },
      )
      .andWhere('CAST(p.embedding AS vector) <=> CAST(:vec AS vector) < 0.15')
      .orderBy('CAST(p.embedding AS vector) <=> CAST(:vec AS vector)', 'ASC')
      .setParameter('vec', vecString)
      .limit(1)
      .getOne();

    if (existing) {
      existing.reinforcementCount += 1;
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.lastReinforcedAt = new Date();
      await this.repo.save(existing);
    } else {
      await this.repo.save(
        this.repo.create({
          tenantId,
          userId,
          category: pref.category,
          key: pref.key.substring(0, 100),
          value: pref.value.substring(0, 500),
          confidence: pref.confidence,
          embedding: vecString,
          lastReinforcedAt: new Date(),
        }),
      );
    }
  }

  async buildMemoryBlock(
    userId: string,
    tenantId: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (!userId || !tenantId) return '';
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    if (!lastUserMsg) return '';

    const candidates = await this.searchPreferences(
      userId,
      tenantId,
      lastUserMsg,
      20,
    );
    if (candidates.length === 0) return '';

    let top = candidates;
    if (candidates.length > 8) {
      try {
        const { rerankedDocuments } = await rerank({
          model: this.aiRouter.getRerankModel(),
          query: lastUserMsg,
          documents: candidates.map(
            (c) => `${c.category}: ${c.key}: ${c.value}`,
          ),
          topN: 8,
        });
        top = rerankedDocuments
          .map((r: any) => candidates[r.index])
          .filter(Boolean);
      } catch (err) {
        this.logger.warn(
          `[DreamerPreferences] rerank failed, using pgvector top-8: ${(err as Error).message}`,
        );
        top = candidates.slice(0, 8);
      }
    }

    return this.formatMemoryBlock(top);
  }

  private async searchPreferences(
    userId: string,
    tenantId: string,
    query: string,
    topK: number,
  ): Promise<UserPreference[]> {
    const embedding = await this.vertexEmbed.embed(query);
    const vecString = `[${embedding.join(',')}]`;
    return this.repo
      .createQueryBuilder('p')
      .where(
        'p."tenantId" = :tenantId AND p."userId" = :userId AND p."archivedAt" IS NULL',
        { tenantId, userId },
      )
      .orderBy('CAST(p.embedding AS vector) <=> CAST(:vec AS vector)', 'ASC')
      .setParameter('vec', vecString)
      .limit(topK)
      .getMany();
  }

  async reconcile(userId: string, tenantId: string): Promise<void> {
    const prefs = await this.repo.find({
      where: { userId, tenantId, archivedAt: IsNull() },
      order: { confidence: 'DESC' },
    });

    if (prefs.length < 2) return;

    const archived = new Set<string>();
    for (const anchor of prefs) {
      if (archived.has(anchor.id)) continue;
      const duplicates = await this.repo
        .createQueryBuilder('p')
        .where(
          'p."tenantId" = :tenantId AND p."userId" = :userId AND p."archivedAt" IS NULL',
          { tenantId, userId },
        )
        .andWhere('p.id != :id', { id: anchor.id })
        .andWhere('CAST(p.embedding AS vector) <=> CAST(:vec AS vector) < 0.1')
        .setParameter('vec', anchor.embedding)
        .getMany();

      for (const dup of duplicates) {
        if (archived.has(dup.id)) continue;
        anchor.reinforcementCount += dup.reinforcementCount;
        anchor.confidence = Math.min(
          1,
          Math.max(anchor.confidence, dup.confidence),
        );
        anchor.lastReinforcedAt = new Date();
        await this.repo.save(anchor);
        await this.repo.update(dup.id, { archivedAt: new Date() });
        archived.add(dup.id);
      }
    }
    if (archived.size > 0) {
      this.logger.log(
        `[DreamerPreferences] reconcile merged ${archived.size} duplicates for user=${userId}`,
      );
    }
  }

  private formatMemoryBlock(prefs: UserPreference[]): string {
    if (!prefs.length) return '';
    const byCategory = prefs.reduce<Record<string, UserPreference[]>>(
      (acc, p) => {
        (acc[p.category] ??= []).push(p);
        return acc;
      },
      {},
    );
    const parts = ['# What I remember about this user'];
    if (byCategory.style?.length)
      parts.push(
        '## Communication style',
        ...byCategory.style.map((p) => `- ${p.value}`),
      );
    if (byCategory.fact?.length)
      parts.push(
        '## Facts they shared',
        ...byCategory.fact.map((p) => `- ${p.key}: ${p.value}`),
      );
    if (byCategory.frustration?.length)
      parts.push(
        '## What frustrates them',
        ...byCategory.frustration.map((p) => `- avoid: ${p.value}`),
      );
    if (byCategory.topic?.length)
      parts.push(
        '## Topics they return to',
        ...byCategory.topic.map((p) => `- ${p.value}`),
      );
    return parts.join('\n');
  }
}
