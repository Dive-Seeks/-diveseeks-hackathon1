import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WikiPage } from '../entities/wiki-page.entity';
import { DataRepo } from '../entities/data-repo.entity';
import { DataRepoSearchService } from '../retrieval/data-repo-search.service';

export interface McpQueryResult {
  claim: string;
  confidence: number;
  sourceFile?: string;
  sourcePage?: number;
  sourceQuote: string;
  wikiPage: string;
  relatedDomain: string;
}

@Injectable()
export class DataEngineMcpService {
  constructor(
    @InjectRepository(DataRepo) private readonly repoRepo: Repository<DataRepo>,
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    private readonly search: DataRepoSearchService,
  ) {}

  // Tool: query_data_repo
  async queryDataRepo(
    tenantId: string,
    projectId: string,
    query: string,
    domain?: string,
    topK = 5,
  ): Promise<{ results: McpQueryResult[]; totalFound: number }> {
    const repo = await this.repoRepo.findOne({
      where: {
        tenant_id: tenantId,
        project_id: projectId,
        status: 'active',
      },
    });
    if (!repo) return { results: [], totalFound: 0 };

    const raw = await this.search.search(
      repo.id,
      tenantId,
      query,
      domain,
      topK,
    );
    const results: McpQueryResult[] = raw.map((r) => ({
      claim: r.claim,
      confidence: r.confidence,
      sourceFile: r.sourceId,
      sourcePage: r.sourcePage ?? undefined,
      sourceQuote: r.sourceQuote,
      wikiPage: r.wikiPage,
      relatedDomain: r.domain,
    }));
    return { results, totalFound: results.length };
  }

  // Tool: list_data_repo_pages
  async listDataRepoPages(
    tenantId: string,
    projectId: string,
    domain?: string,
  ) {
    const repo = await this.repoRepo.findOne({
      where: { tenant_id: tenantId, project_id: projectId },
    });
    if (!repo) return { pages: [] };

    const qb = this.wikiPageRepo
      .createQueryBuilder('wp')
      .select([
        'wp.path',
        'wp.title',
        'wp.domain',
        'wp.confidence',
        'wp.updated_at',
      ])
      .where('wp.repo_id = :repoId', { repoId: repo.id })
      .andWhere('wp.tenant_id = :tenantId', { tenantId });
    if (domain) qb.andWhere('wp.domain = :domain', { domain });

    const pages = await qb.getMany();
    return { pages };
  }

  // Tool: get_wiki_page
  async getWikiPage(tenantId: string, projectId: string, pagePath: string) {
    const repo = await this.repoRepo.findOne({
      where: { tenant_id: tenantId, project_id: projectId },
    });
    if (!repo) return null;

    return this.wikiPageRepo.findOne({
      where: { repo_id: repo.id, tenant_id: tenantId, path: pagePath },
    });
  }

  // Tool: get_repo_health
  async getRepoHealth(tenantId: string, projectId: string) {
    const repo = await this.repoRepo.findOne({
      where: { tenant_id: tenantId, project_id: projectId },
    });
    if (!repo) return null;

    const domainCounts = await this.wikiPageRepo
      .createQueryBuilder('wp')
      .select('wp.domain', 'domain')
      .addSelect('COUNT(*)', 'count')
      .where('wp.repo_id = :repoId', { repoId: repo.id })
      .groupBy('wp.domain')
      .getRawMany();

    return {
      repoId: repo.id,
      name: repo.name,
      status: repo.status,
      pageCount: repo.page_count,
      pendingContradictions: repo.pending_contradictions,
      lastIngest: repo.last_ingest_at,
      coverageByDomain: domainCounts,
    };
  }
}
