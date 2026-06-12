import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WikiPage } from '../data-engine/entities/wiki-page.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { rerank } from 'ai';
import { DataRepo } from '../data-engine/entities/data-repo.entity';
import { TenantKnowledge } from '../knowledge-store/entities/tenant-knowledge.entity';
import { toSql } from 'pgvector';

@Injectable()
export class DataEngineContextService {
  private readonly logger = new Logger(DataEngineContextService.name);

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiRepo: Repository<WikiPage>,
    @InjectRepository(DataRepo)
    private readonly dataRepoRepo: Repository<DataRepo>,
    @InjectRepository(TenantKnowledge)
    private readonly knowledgeRepo: Repository<TenantKnowledge>,
    private readonly vertexEmbed: VertexEmbeddingService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async getWikiResults(
    tenantId: string,
    query: string,
    projectId?: string,
  ): Promise<any[]> {
    try {
      const { embedding: queryEmbedding } = await this.embed(query);

      const qb = this.wikiRepo
        .createQueryBuilder('wp')
        .where('wp.tenant_id = :tenantId', { tenantId });

      if (projectId) {
        const repos = await this.dataRepoRepo.find({
          where: { tenant_id: tenantId, project_id: projectId },
          select: ['id'],
        });
        const repoIds = repos.map((r) => r.id);
        if (repoIds.length > 0) {
          qb.andWhere('wp.repo_id IN (:...repoIds)', { repoIds });
        }
      }

      const wide = await qb
        .orderBy(
          'CAST(wp.embedding AS vector) <=> CAST(:vector AS vector)',
          'ASC',
        )
        .setParameter('vector', toSql(queryEmbedding))
        .limit(50)
        .getMany();

      if (wide.length === 0) return [];
      if (process.env.RERANK_ENABLED !== 'true') return wide.slice(0, 3);

      const { rerankedDocuments } = await rerank({
        model: this.aiRouter.getRerankModel(),
        query,
        documents: wide.map((r) => ({ id: r.id, text: r.content })),
        topN: 3,
      });

      return rerankedDocuments.map((doc) => wide.find((w) => w.id === doc.id));
    } catch (e) {
      this.logger.warn(
        `[getWikiResults] pgvector unavailable, skipping: ${(e as Error).message}`,
      );
      return [];
    }
  }

  async getWebResults(tenantId: string, query: string): Promise<any[]> {
    try {
      const { embedding: queryEmbedding } = await this.embed(query);

      const chunks = await this.knowledgeRepo
        .createQueryBuilder('tk')
        .where('tk.tenantId = :tenantId', { tenantId })
        .orderBy('tk.isSynthesis', 'DESC')
        .addOrderBy(
          'CAST(tk.embedding AS vector) <=> CAST(:vector AS vector)',
          'ASC',
        )
        .setParameter('vector', toSql(queryEmbedding))
        .limit(50)
        .getMany();

      if (chunks.length === 0) return [];
      if (process.env.RERANK_ENABLED !== 'true') {
        return chunks.slice(0, 5).map((c) => ({
          content: c.content,
          isSynthesized: c.isSynthesis,
        }));
      }

      const { rerankedDocuments } = await rerank({
        model: this.aiRouter.getRerankModel(),
        query,
        documents: chunks.map((c) => c.content),
        topN: 5,
      });

      return rerankedDocuments.map((doc) => {
        const chunk = chunks.find((c) => c.content === doc);
        return {
          content: doc,
          isSynthesized: chunk?.isSynthesis ?? false,
        };
      });
    } catch (e) {
      this.logger.warn(
        `[getWebResults] pgvector unavailable, skipping: ${(e as Error).message}`,
      );
      return [];
    }
  }

  private async embed(text: string): Promise<{ embedding: number[] }> {
    const embedding = await this.vertexEmbed.embed(text);
    return { embedding };
  }

  /**
   * Fetches the most relevant wiki context for a given task and domain.
   */
  async getRelevantContext(
    tenantId: string,
    domain: string,
    taskDescription: string,
    maxTokens: number = 1500,
    projectId?: string,
  ): Promise<string | null> {
    const results = await this.getWikiResults(
      tenantId,
      taskDescription,
      projectId,
    );
    if (results.length === 0) return null;

    // 5. Format for injection — concise, cited
    let totalChars = 0;
    const maxChars = maxTokens * 4; // approximate

    return results
      .map((r) => {
        const chunk = `[Company Knowledge: ${r.title}]\n${r.content}`;
        totalChars += chunk.length;
        if (totalChars > maxChars)
          return chunk.slice(0, maxChars - (totalChars - chunk.length));
        return chunk;
      })
      .join('\n\n');
  }
}
