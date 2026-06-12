import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuEmbedding } from './menu-embeddings.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';

export interface SimilarDish {
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

@Injectable()
export class MenuEmbeddingsService {
  private readonly logger = new Logger(MenuEmbeddingsService.name);

  constructor(
    @InjectRepository(MenuEmbedding)
    private readonly repo: Repository<MenuEmbedding>,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {}

  async embedText(text: string): Promise<number[]> {
    return this.vertexEmbed.embed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.vertexEmbed.embedBatch(texts);
  }

  async upsertEmbedding(params: {
    tenantId: string | null;
    sourceType: string;
    sourceId: string;
    content: string;
    metadata: Record<string, unknown>;
    embedding: number[];
  }): Promise<void> {
    const { tenantId, sourceType, sourceId, content, metadata, embedding } =
      params;
    const existing = await this.repo
      .createQueryBuilder('me')
      .where('me.source_id = :sourceId', { sourceId })
      .andWhere('me.source_type = :sourceType', { sourceType })
      .andWhere(
        tenantId === null ? 'me.tenant_id IS NULL' : 'me.tenant_id = :tenantId',
        tenantId !== null ? { tenantId } : {},
      )
      .getOne();

    if (existing) {
      await this.repo
        .createQueryBuilder()
        .update()
        .set({ content, embedding })
        .where('id = :id', { id: existing.id })
        .execute();
    } else {
      const entity = this.repo.create({
        tenantId,
        sourceType,
        sourceId,
        content,
        metadata,
        embedding,
      });
      await this.repo.save(entity);
    }
  }

  async similarDishes(params: {
    queryEmbedding: number[];
    tenantId?: string | null;
    sourceType?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<SimilarDish[]> {
    const {
      queryEmbedding,
      tenantId,
      sourceType,
      limit = 20,
      minSimilarity = 0.3,
    } = params;

    const vecStr = `[${queryEmbedding.join(',')}]`;
    const threshold = 1 - minSimilarity; // <=> is cosine DISTANCE (lower = more similar)

    const qb = this.repo
      .createQueryBuilder('me')
      .select('me.source_id', 'sourceId')
      .addSelect('me.content', 'content')
      .addSelect('me.metadata', 'metadata')
      .addSelect(
        `1 - (CAST(me.embedding AS vector) <=> CAST(:vec AS vector))`,
        'similarity',
      )
      .where('me.embedding IS NOT NULL')
      .andWhere(
        `CAST(me.embedding AS vector) <=> CAST(:vec AS vector) <= :threshold`,
        { threshold },
      )
      .setParameter('vec', vecStr)
      .orderBy(`CAST(me.embedding AS vector) <=> CAST(:vec AS vector)`, 'ASC')
      .limit(limit);

    if (sourceType) qb.andWhere('me.source_type = :sourceType', { sourceType });
    if (tenantId !== undefined) {
      if (tenantId === null) {
        qb.andWhere('me.tenant_id IS NULL');
      } else {
        qb.andWhere('(me.tenant_id = :tenantId OR me.tenant_id IS NULL)', {
          tenantId,
        });
      }
    }

    const rows = await qb.getRawMany<{
      sourceId: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: string;
    }>();

    return rows.map((r) => ({
      sourceId: r.sourceId,
      content: r.content,
      metadata: r.metadata,
      similarity: Number(r.similarity),
    }));
  }

  async countEmbeddings(sourceType?: string): Promise<number> {
    const qb = this.repo.createQueryBuilder('me').where('me.tenant_id IS NULL');
    if (sourceType) qb.andWhere('me.source_type = :sourceType', { sourceType });
    return qb.getCount();
  }
}
