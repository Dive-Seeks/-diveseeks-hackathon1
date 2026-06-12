import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrowserAgentService } from './browser-agent.service';
import { ContentCleanerService } from './content-cleaner.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { VocabularyService } from '../tokenizer/vocabulary.service';
import { KnowledgeStoreService } from '../knowledge-store';
import { ResearchJob } from './entities/research-job.entity';
import { WebChunk } from '../tokenizer/entities/web-chunk.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';

@Injectable()
export class WebResearchService {
  constructor(
    private readonly browserAgent: BrowserAgentService,
    private readonly contentCleaner: ContentCleanerService,
    private readonly tokenizer: TokenizerService,
    private readonly vocabularyService: VocabularyService,
    private readonly knowledgeStore: KnowledgeStoreService,
    @InjectRepository(ResearchJob)
    private readonly researchJobRepo: Repository<ResearchJob>,
    @InjectRepository(WebChunk)
    private readonly webChunkRepo: Repository<WebChunk>,
    private readonly embeddingService: VertexEmbeddingService,
  ) {}

  async research(
    query: string,
    tenantId: string | null,
    jobId: string,
    passedDomain?: string,
  ): Promise<{ chunksIndexed: number; totalTokens: number }> {
    // Step 1: Search → 5 URLs
    const urls = await this.browserAgent.search(query);
    await this.updateJob(jobId, { status: 'scraping', urlsScraped: urls });

    // Step 2: Scrape each URL
    const rawTexts = await Promise.allSettled(
      urls.map((url) => this.browserAgent.scrape(url)),
    );

    // Step 3: Tokenize + chunk
    await this.updateJob(jobId, { status: 'tokenizing' });
    const allChunks: { url: string; chunk: string; tokenCount: number }[] = [];
    let totalTokens = 0;

    for (let i = 0; i < rawTexts.length; i++) {
      if (rawTexts[i].status === 'rejected') continue;
      const cleaned = this.contentCleaner.clean(
        (rawTexts[i] as PromiseFulfilledResult<string>).value,
      );
      const chunks = this.tokenizer.chunk(cleaned);

      for (const chunk of chunks) {
        const tokenCount = this.tokenizer.countTokens(chunk);
        allChunks.push({
          url: urls[i],
          chunk,
          tokenCount,
        });
        totalTokens += tokenCount;
      }
    }

    // Issue 1 Fix: Real BPE Token Tracking for Domain Fingerprinting
    const tokensForTracking: { token: string; tokenId: number }[] = [];
    for (const c of allChunks) {
      const ids = this.tokenizer.encode(c.chunk);
      // Sample first 10 tokens from each chunk to avoid DB overload while getting signal
      for (let j = 0; j < Math.min(ids.length, 10); j++) {
        const tid = ids[j];
        tokensForTracking.push({
          token: this.tokenizer.decodeSingle(tid),
          tokenId: tid,
        });
      }
    }

    const domain = passedDomain || query.split(' ')[0].toLowerCase();
    await this.vocabularyService.trackTokens(tokensForTracking, domain);

    // Step 4: Embed + index
    await this.updateJob(jobId, { status: 'indexing' });

    for (let i = 0; i < allChunks.length; i++) {
      const { url, chunk, tokenCount } = allChunks[i];
      const embedding = await this.embeddingService.embed(chunk);

      // Gap 2 Fix: Real WebChunk traceability
      const webChunk = await this.webChunkRepo.save({
        researchJobId: jobId,
        sourceUrl: url,
        content: chunk,
        tokenCount,
        chunkIndex: i,
        embedding,
        tenantId,
        status: 'active',
      });

      await this.knowledgeStore.store({
        content: chunk,
        tokenCount,
        sourceUrl: url,
        tenantId,
        researchJobId: jobId,
        webChunkId: webChunk.id,
        embedding,
        chunkIndex: i,
      });
    }

    await this.updateJob(jobId, {
      status: 'indexed',
      chunksIndexed: allChunks.length,
    });

    return {
      chunksIndexed: allChunks.length,
      totalTokens,
    };
  }

  async searchChunks(
    query: string,
    tenantId: string | null,
    topK = 10,
  ): Promise<
    Array<{
      id: string;
      content: string;
      sourceUrl: string;
      chunkIndex: number;
    }>
  > {
    const embedding = await this.embeddingService.embed(query);
    const vecString = `[${embedding.join(',')}]`;

    const qb = this.webChunkRepo
      .createQueryBuilder('wc')
      .where("wc.status = 'active'")
      .orderBy('CAST(wc.embedding AS vector) <=> CAST(:vec AS vector)', 'ASC')
      .setParameter('vec', vecString)
      .limit(topK);

    if (tenantId) {
      qb.andWhere('(wc."tenantId" = :tenantId OR wc."tenantId" IS NULL)', {
        tenantId,
      });
    } else {
      qb.andWhere('wc."tenantId" IS NULL');
    }

    const chunks = await qb.getMany();
    return chunks.map((c) => ({
      id: c.id,
      content: c.content,
      sourceUrl: c.sourceUrl,
      chunkIndex: c.chunkIndex,
    }));
  }

  private async updateJob(jobId: string, data: Partial<ResearchJob>) {
    await this.researchJobRepo.update(jobId, data);
  }
}
