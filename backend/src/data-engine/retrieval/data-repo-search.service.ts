import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WikiPage } from '../entities/wiki-page.entity';
import { VertexEmbeddingService } from '../../common/vertex-embedding.service';
import { Extraction } from '../entities/extraction.entity';
import {
  GraphBuilderService,
  KnowledgeGraph,
} from '../pipeline/graph-builder.service';
import { toSql } from 'pgvector';

export interface SearchResult {
  claim: string;
  confidence: number;
  sourceId: string;
  sourcePage: number | null;
  sourceQuote: string;
  wikiPage: string;
  domain: string;
  score: number;
  source: 'vector' | 'graph';
}

@Injectable()
export class DataRepoSearchService {
  private readonly logger = new Logger(DataRepoSearchService.name);
  private readonly GRAPH_DECAY = 0.7;
  private readonly MAX_HOPS = 2;

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    @InjectRepository(Extraction)
    private readonly extractionRepo: Repository<Extraction>,
    private readonly graphBuilder: GraphBuilderService,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {}

  async search(
    repoId: string,
    tenantId: string,
    query: string,
    domain?: string,
    topK = 5,
  ): Promise<SearchResult[]> {
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.vertexEmbed.embed(query);
    } catch (e) {
      this.logger.warn(
        `Wiki embed failed, using keyword fallback: ${(e as Error).message}`,
      );
    }

    let vectorScored: { page: WikiPage; similarity: number }[] = [];

    if (queryEmbedding) {
      try {
        // --- Phase 1: pgvector cosine distance (<=> operator, ascending = most similar first) ---
        const qb = this.wikiPageRepo
          .createQueryBuilder('wp')
          .where('wp.repo_id = :repoId', { repoId })
          .andWhere('wp.tenant_id = :tenantId', { tenantId })
          .andWhere('wp.embedding IS NOT NULL')
          .orderBy(
            'CAST(wp.embedding AS vector) <=> CAST(:vector AS vector)',
            'ASC',
          )
          .setParameter('vector', toSql(queryEmbedding))
          .take(topK * 2);
        if (domain) qb.andWhere('wp.domain = :domain', { domain });
        const pages = await qb.getMany();
        vectorScored = pages.map((page, i) => ({
          page,
          similarity: 1 - i * 0.05, // monotonically decreasing proxy — exact distance unused downstream
        }));
      } catch (e) {
        this.logger.warn(
          `pgvector wiki search failed, falling back to keyword scan: ${(e as Error).message}`,
        );
        queryEmbedding = null;
      }
    }

    if (!queryEmbedding) {
      // --- Phase 1 fallback: keyword content search when Vertex embed unavailable ---
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const qb = this.wikiPageRepo
        .createQueryBuilder('wp')
        .where('wp.repo_id = :repoId', { repoId })
        .andWhere('wp.tenant_id = :tenantId', { tenantId });
      if (domain) qb.andWhere('wp.domain = :domain', { domain });
      const pages = await qb.getMany();
      vectorScored = pages
        .map((p) => {
          const text = (p.content + ' ' + p.title).toLowerCase();
          const hits = keywords.filter((k) => text.includes(k)).length;
          return { page: p, similarity: hits / Math.max(keywords.length, 1) };
        })
        .filter((r) => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK * 2);
    }

    // --- Phase 2: Graph expansion (2-hop traversal with decay) ---
    // allPages needed for graph domain lookups — fetch lightweight (no embedding column)
    const allPagesQb = this.wikiPageRepo
      .createQueryBuilder('wp')
      .select([
        'wp.id',
        'wp.domain',
        'wp.path',
        'wp.title',
        'wp.confidence',
        'wp.content',
        'wp.source_ids',
        'wp.repo_id',
        'wp.tenant_id',
        'wp.created_at',
        'wp.updated_at',
      ])
      .where('wp.repo_id = :repoId', { repoId })
      .andWhere('wp.tenant_id = :tenantId', { tenantId });
    if (domain) allPagesQb.andWhere('wp.domain = :domain', { domain });
    const allPages = await allPagesQb.getMany();
    const graph = await this.graphBuilder.loadGraph(repoId);
    const graphExpanded = this.expandWithGraph(vectorScored, allPages, graph);

    // --- Phase 3: Merge and deduplicate ---
    const merged = this.mergeResults(vectorScored, graphExpanded);

    // --- Phase 4: Fetch extractions from top pages ---
    const results: SearchResult[] = [];
    for (const { page, similarity, source } of merged.slice(0, topK)) {
      const extractions = await this.extractionRepo.find({
        where: {
          repo_id: repoId,
          tenant_id: tenantId,
          domain: page.domain,
          status: 'accepted',
        },
        order: { confidence: 'DESC' },
        take: 3,
      });

      for (const ext of extractions) {
        results.push({
          claim: ext.claim,
          confidence: ext.confidence,
          sourceId: ext.source_id,
          sourcePage: ext.source_page ?? null,
          sourceQuote: ext.source_quote ?? '',
          wikiPage: page.path,
          domain: page.domain,
          score: similarity * ext.confidence,
          source,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * 2-hop graph expansion with decay factor.
   * Uses seed domains from vector results to find related pages via knowledge graph edges.
   * Decay = 0.7 per hop: direct neighbour gets 70% of seed score, 2nd hop gets 49%.
   */
  private expandWithGraph(
    seeds: { page: WikiPage; similarity: number }[],
    allPages: WikiPage[],
    graph: KnowledgeGraph | null,
  ): { page: WikiPage; similarity: number; source: 'graph' }[] {
    if (!graph || seeds.length === 0) return [];

    const seedDomains = new Set(seeds.map((s) => s.page.domain));
    const seedPageIds = new Set(seeds.map((s) => s.page.id));
    const expanded = new Map<string, { page: WikiPage; similarity: number }>();

    // Find graph nodes matching seed domains
    const seedNodeIds = graph.nodes
      .filter((n) => seedDomains.has(n.domain))
      .map((n) => n.id);

    // Hop 1: direct neighbours
    const hop1Nodes = new Set<string>();
    for (const edge of graph.edges) {
      const weight = edge.weight || 1;
      if (seedNodeIds.includes(edge.from)) {
        hop1Nodes.add(edge.to);
        this.addGraphResult(
          edge.to,
          weight,
          1,
          graph,
          allPages,
          seedPageIds,
          expanded,
          seeds,
        );
      }
      if (seedNodeIds.includes(edge.to)) {
        hop1Nodes.add(edge.from);
        this.addGraphResult(
          edge.from,
          weight,
          1,
          graph,
          allPages,
          seedPageIds,
          expanded,
          seeds,
        );
      }
    }

    // Hop 2: neighbours of neighbours
    for (const edge of graph.edges) {
      const weight = edge.weight || 1;
      if (hop1Nodes.has(edge.from) && !seedNodeIds.includes(edge.to)) {
        this.addGraphResult(
          edge.to,
          weight,
          2,
          graph,
          allPages,
          seedPageIds,
          expanded,
          seeds,
        );
      }
      if (hop1Nodes.has(edge.to) && !seedNodeIds.includes(edge.from)) {
        this.addGraphResult(
          edge.from,
          weight,
          2,
          graph,
          allPages,
          seedPageIds,
          expanded,
          seeds,
        );
      }
    }

    return [...expanded.values()].map((r) => ({
      ...r,
      source: 'graph' as const,
    }));
  }

  private addGraphResult(
    nodeId: string,
    edgeWeight: number,
    hopCount: number,
    graph: KnowledgeGraph,
    allPages: WikiPage[],
    seedPageIds: Set<string>,
    expanded: Map<string, { page: WikiPage; similarity: number }>,
    seeds: { page: WikiPage; similarity: number }[],
  ): void {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const page = allPages.find((p) => p.domain === node.domain);
    if (!page || seedPageIds.has(page.id)) return;

    // Decay factor: score = best_seed_score × (0.7)^hops × edge_weight/5
    const bestSeedScore = Math.max(...seeds.map((s) => s.similarity));
    const decayedScore =
      bestSeedScore * Math.pow(this.GRAPH_DECAY, hopCount) * (edgeWeight / 5);

    const existing = expanded.get(page.id);
    if (!existing || existing.similarity < decayedScore) {
      expanded.set(page.id, { page, similarity: decayedScore });
    }
  }

  private mergeResults(
    vector: { page: WikiPage; similarity: number }[],
    graph: { page: WikiPage; similarity: number; source: 'graph' }[],
  ): { page: WikiPage; similarity: number; source: 'vector' | 'graph' }[] {
    const merged = new Map<
      string,
      { page: WikiPage; similarity: number; source: 'vector' | 'graph' }
    >();

    for (const v of vector) {
      merged.set(v.page.id, {
        page: v.page,
        similarity: v.similarity,
        source: 'vector',
      });
    }

    for (const g of graph) {
      const existing = merged.get(g.page.id);
      if (!existing) {
        merged.set(g.page.id, g);
      }
      // If already in vector results, keep vector (higher quality signal)
    }

    return [...merged.values()].sort((a, b) => b.similarity - a.similarity);
  }

  private cosine(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
