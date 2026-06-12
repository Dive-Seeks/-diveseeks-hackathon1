import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalKnowledge } from './entities/global-knowledge.entity';
import { TenantKnowledge } from './entities/tenant-knowledge.entity';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { EmbeddingService } from '../menu-embeddings/embedding.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { rerank } from 'ai';
import { toSql } from 'pgvector';

export interface KnowledgeSearchResult {
  found: boolean;
  chunks: { id: string; content: string }[];
  totalTokens: number;
  sources: string[];
}

export interface StoreKnowledgeDto {
  content: string;
  tokenCount: number;
  sourceUrl: string;
  tenantId: string | null;
  researchJobId: string;
  webChunkId: string;
  embedding: number[];
  chunkIndex: number;
}

@Injectable()
export class KnowledgeStoreService {
  constructor(
    @InjectRepository(GlobalKnowledge)
    private readonly globalRepo: Repository<GlobalKnowledge>,
    @InjectRepository(TenantKnowledge)
    private readonly tenantRepo: Repository<TenantKnowledge>,
    private readonly tokenizer: TokenizerService,
    private readonly embeddingService: EmbeddingService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async search(
    query: string,
    tenantId: string | null,
    maxTokens = 2000,
  ): Promise<KnowledgeSearchResult> {
    const vector = await this.embeddingService.embed(query);

    let globalHits: any[] = [];
    let tenantHits: any[] = [];

    try {
      // Search global tier (always)
      globalHits = await this.globalRepo
        .createQueryBuilder('gk')
        .where("gk.status != 'stale'")
        .orderBy('gk.isSynthesis', 'DESC')
        .addOrderBy(
          'CAST(gk.embedding AS vector) <=> CAST(:vector AS vector)',
          'ASC',
        )
        .setParameter('vector', toSql(vector))
        .limit(50)
        .getMany();

      // Search tenant tier (if tenantId provided)
      tenantHits = tenantId
        ? await this.tenantRepo
            .createQueryBuilder('tk')
            .where('tk.tenantId = :tenantId', { tenantId })
            .andWhere("tk.status != 'stale'")
            .orderBy('tk.isSynthesis', 'DESC')
            .addOrderBy(
              'CAST(tk.embedding AS vector) <=> CAST(:vector AS vector)',
              'ASC',
            )
            .setParameter('vector', toSql(vector))
            .limit(50)
            .getMany()
        : [];
    } catch (e) {
      console.warn(
        '[KnowledgeStore] pgvector search failed or missing, skipping search...',
        e.message,
      );
    }

    // Merge: tenant-specific results ranked first, then global
    let merged = [...tenantHits, ...globalHits];

    if (merged.length > 0 && process.env.RERANK_ENABLED === 'true') {
      try {
        const { rerankedDocuments } = await rerank({
          model: this.aiRouter.getRerankModel(),
          query,
          documents: merged.map((h) => h.content),
          topN: 10,
        });
        merged = rerankedDocuments.map((doc) =>
          merged.find((m) => m.content === doc),
        );
      } catch (err) {
        console.warn(
          '[KnowledgeStore] rerank failed, falling back to raw results',
          (err as Error).message,
        );
        merged = merged.slice(0, 10);
      }
    } else {
      merged = merged.slice(0, 10);
    }

    // Fit to token budget
    const fittedStrings = this.tokenizer.fitToWindow(
      merged.map((h) => h.content),
      maxTokens,
    );

    const fittedChunks = merged.slice(0, fittedStrings.length).map((h) => ({
      id: h.id,
      content: h.content,
    }));

    // Increment hitCount for every chunk returned (health signal for eviction decisions)
    if (fittedChunks.length > 0) {
      const ids = fittedChunks.map((c) => c.id);
      await Promise.allSettled([
        this.globalRepo
          .createQueryBuilder()
          .update()
          .set({ hitCount: () => '"hitCount" + 1' })
          .whereInIds(ids)
          .execute(),
        this.tenantRepo
          .createQueryBuilder()
          .update()
          .set({ hitCount: () => '"hitCount" + 1' })
          .whereInIds(ids)
          .execute(),
      ]);
    }

    return {
      found: fittedChunks.length > 0,
      chunks: fittedChunks,
      totalTokens: fittedChunks.reduce(
        (sum, c) => sum + this.tokenizer.countTokens(c.content),
        0,
      ),
      sources: fittedChunks.map((_, i) => merged[i].sourceUrl),
    };
  }

  async store(data: StoreKnowledgeDto): Promise<void> {
    // Routes to global or tenant table based on tenantId
    if (data.tenantId) {
      const entity = this.tenantRepo.create({
        tenantId: data.tenantId,
        webChunkId: data.webChunkId,
        content: data.content,
        tokenCount: data.tokenCount,
        sourceUrl: data.sourceUrl,
        embedding: data.embedding,
        status: 'active',
      });
      await this.tenantRepo.save(entity);
    } else {
      const entity = this.globalRepo.create({
        webChunkId: data.webChunkId,
        content: data.content,
        tokenCount: data.tokenCount,
        sourceUrl: data.sourceUrl,
        embedding: data.embedding,
        status: 'active',
      });
      await this.globalRepo.save(entity);
    }
  }

  async softDelete(id: string): Promise<void> {
    // Try to update in both tables (simpler than tracking which table it belongs to)
    await this.globalRepo.update(id, { status: 'stale' });
    await this.tenantRepo.update(id, { status: 'stale' });
  }

  async softDeleteBySource(sourceUrl: string): Promise<void> {
    await this.globalRepo.update(
      { sourceUrl, status: 'active' },
      { status: 'stale' },
    );
    await this.tenantRepo.update(
      { sourceUrl, status: 'active' },
      { status: 'stale' },
    );
  }
}
