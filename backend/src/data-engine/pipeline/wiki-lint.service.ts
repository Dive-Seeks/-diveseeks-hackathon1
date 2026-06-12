import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HermesGateway } from '../../hermes/hermes.gateway';
import { WikiPage } from '../entities/wiki-page.entity';
import { Extraction } from '../entities/extraction.entity';
import { SourceDocument } from '../entities/source-document.entity';
import { DataRepo } from '../entities/data-repo.entity';
import { LintRun } from '../entities/lint-run.entity';
import { GraphBuilderService, KnowledgeGraph } from './graph-builder.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LintResult {
  orphanPages: string[];
  staleClaims: { extractionId: string; claim: string; ageInDays: number }[];
  missingCrossRefs: { from: string; to: string; reason: string }[];
  knowledgeGaps: {
    domain: string;
    pageCount: number;
    sourceCount: number;
    gapSeverity: 'low' | 'medium' | 'high';
  }[];
  sparseGraphNodes: string[];
  researchTriggered: { domain: string; query: string }[];
  totalIssues: number;
}

/**
 * Periodic Wiki Lint / Health-Check Service
 *
 * Implements Karpathy's third core wiki operation: periodic health checking.
 * Detects orphan pages, stale claims, missing cross-references,
 * knowledge gaps, and sparse graph communities.
 */
@Injectable()
export class WikiLintService {
  private readonly logger = new Logger(WikiLintService.name);
  private readonly STALE_DAYS = 30;

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    @InjectRepository(Extraction)
    private readonly extractionRepo: Repository<Extraction>,
    @InjectRepository(SourceDocument)
    private readonly sourceRepo: Repository<SourceDocument>,
    @InjectRepository(DataRepo)
    private readonly repoRepo: Repository<DataRepo>,
    @InjectRepository(LintRun)
    private readonly lintRunRepo: Repository<LintRun>,
    private readonly graphBuilder: GraphBuilderService,
    @Optional()
    @InjectQueue('web-research-global')
    private readonly researchQueue?: Queue,
    @Optional() private readonly gateway?: HermesGateway,
  ) {}

  async lint(repoId: string, tenantId: string): Promise<LintResult> {
    this.logger.log(`[WikiLint] Starting lint for repo ${repoId}...`);

    const pages = await this.wikiPageRepo.find({
      where: { repo_id: repoId, tenant_id: tenantId },
    });
    const graph = await this.graphBuilder.loadGraph(repoId);

    const [
      orphanPages,
      staleClaims,
      missingCrossRefs,
      knowledgeGaps,
      sparseGraphNodes,
    ] = await Promise.all([
      this.findOrphanPages(pages),
      this.findStaleClaims(repoId, tenantId),
      this.findMissingCrossRefs(pages, graph),
      this.findKnowledgeGaps(repoId, tenantId, pages),
      this.findSparseGraphNodes(graph),
    ]);

    const result: LintResult = {
      orphanPages,
      staleClaims,
      missingCrossRefs,
      knowledgeGaps,
      sparseGraphNodes,
      researchTriggered: [],
      totalIssues:
        orphanPages.length +
        staleClaims.length +
        missingCrossRefs.length +
        knowledgeGaps.filter((g) => g.gapSeverity !== 'low').length +
        sparseGraphNodes.length,
    };

    // Auto-trigger deep research for high-severity gaps and sparse nodes
    result.researchTriggered = await this.autoTriggerResearch(
      tenantId,
      knowledgeGaps,
      sparseGraphNodes,
      graph,
    );

    // Update last_lint_at on the repo
    await this.repoRepo.update({ id: repoId }, { last_lint_at: new Date() });

    await this.appendLog(repoId, tenantId, result);

    await this.lintRunRepo.save({
      repo_id: repoId,
      tenant_id: tenantId,
      total_issues: result.totalIssues,
      orphan_pages: result.orphanPages.length,
      stale_claims: result.staleClaims.length,
      missing_cross_refs: result.missingCrossRefs.length,
      knowledge_gaps: result.knowledgeGaps.length,
      sparse_nodes: result.sparseGraphNodes.length,
      research_triggered: result.researchTriggered.length,
    });

    if (this.gateway?.server && result.researchTriggered.length > 0) {
      this.gateway.server
        .to(`tenant:${tenantId}`)
        .emit('lint_research_queued', {
          repoId,
          tenantId,
          triggered: result.researchTriggered,
          totalIssues: result.totalIssues,
          triggeredAt: new Date().toISOString(),
        });
    }

    this.logger.log(
      `[WikiLint] Complete: ${result.totalIssues} issues found ` +
        `(${orphanPages.length} orphans, ${staleClaims.length} stale, ` +
        `${missingCrossRefs.length} missing refs, ${knowledgeGaps.length} gaps, ` +
        `${sparseGraphNodes.length} sparse nodes, ` +
        `${result.researchTriggered.length} research jobs triggered)`,
    );

    return result;
  }

  /**
   * Find wiki pages that have no inbound wikilinks from other pages.
   */
  private async findOrphanPages(pages: WikiPage[]): Promise<string[]> {
    // Collect all wikilinks targets from all pages
    const allLinkedPaths = new Set<string>();
    for (const page of pages) {
      const wikilinks = page.content.match(/\[\[(.*?)\]\]/g) || [];
      for (const link of wikilinks) {
        allLinkedPaths.add(link.replace(/\[\[|\]\]/g, '').toLowerCase());
      }
    }

    // A page is orphan if no other page links to it
    return pages
      .filter(
        (p) =>
          !allLinkedPaths.has(p.path.toLowerCase()) &&
          !allLinkedPaths.has(p.title.toLowerCase()),
      )
      .map((p) => p.path);
  }

  /**
   * Find extractions older than STALE_DAYS that have newer sources in the same domain.
   */
  private async findStaleClaims(
    repoId: string,
    tenantId: string,
  ): Promise<{ extractionId: string; claim: string; ageInDays: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.STALE_DAYS);

    const staleExtractions = await this.extractionRepo.find({
      where: {
        repo_id: repoId,
        tenant_id: tenantId,
        status: 'accepted',
        created_at: LessThan(cutoff),
      },
      take: 50,
    });

    // Check if there are newer sources in the same domain
    const results: {
      extractionId: string;
      claim: string;
      ageInDays: number;
    }[] = [];
    for (const ext of staleExtractions) {
      const newerExists = await this.extractionRepo
        .createQueryBuilder('e')
        .where('e.repo_id = :repoId', { repoId })
        .andWhere('e.domain = :domain', { domain: ext.domain })
        .andWhere('e.created_at > :cutoff', { cutoff })
        .andWhere('e.id != :id', { id: ext.id })
        .getCount();

      if (newerExists > 0) {
        const ageMs = Date.now() - new Date(ext.created_at).getTime();
        results.push({
          extractionId: ext.id,
          claim: ext.claim.substring(0, 100),
          ageInDays: Math.floor(ageMs / 86400000),
        });
      }
    }

    return results;
  }

  /**
   * Find pages that should cross-reference each other based on graph edges
   * but don't have wikilinks.
   */
  private async findMissingCrossRefs(
    pages: WikiPage[],
    graph: KnowledgeGraph | null,
  ): Promise<{ from: string; to: string; reason: string }[]> {
    if (!graph || pages.length < 2) return [];

    const missing: { from: string; to: string; reason: string }[] = [];

    // Check: for each RELATED_TO or DEPENDS_ON edge, do the corresponding pages link to each other?
    for (const edge of graph.edges) {
      if (!['RELATED_TO', 'DEPENDS_ON', 'APPLIES_TO'].includes(edge.type))
        continue;

      const fromNode = graph.nodes.find((n) => n.id === edge.from);
      const toNode = graph.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const fromPage = pages.find((p) => p.domain === fromNode.domain);
      const toPage = pages.find((p) => p.domain === toNode.domain);
      if (!fromPage || !toPage || fromPage.id === toPage.id) continue;

      const hasLink =
        fromPage.content.includes(`[[${toPage.path}]]`) ||
        fromPage.content.includes(`[[${toPage.title}]]`);
      if (!hasLink) {
        missing.push({
          from: fromPage.path,
          to: toPage.path,
          reason: `Graph shows ${edge.type} (weight: ${edge.weight}) between ${fromNode.label} and ${toNode.label}`,
        });
      }
    }

    return missing.slice(0, 20);
  }

  /**
   * Find domains with many sources but few wiki pages (knowledge gaps).
   */
  private async findKnowledgeGaps(
    repoId: string,
    tenantId: string,
    pages: WikiPage[],
  ): Promise<
    {
      domain: string;
      pageCount: number;
      sourceCount: number;
      gapSeverity: 'low' | 'medium' | 'high';
    }[]
  > {
    // Count extractions per domain
    const domainCounts = await this.extractionRepo
      .createQueryBuilder('e')
      .select('e.domain', 'domain')
      .addSelect('COUNT(*)', 'count')
      .where('e.repo_id = :repoId', { repoId })
      .andWhere('e.tenant_id = :tenantId', { tenantId })
      .groupBy('e.domain')
      .getRawMany();

    const pagesByDomain = new Map<string, number>();
    for (const page of pages) {
      pagesByDomain.set(page.domain, (pagesByDomain.get(page.domain) || 0) + 1);
    }

    return domainCounts
      .map((dc) => {
        const sourceCount = parseInt(dc.count);
        const pageCount = pagesByDomain.get(dc.domain) || 0;
        const ratio = pageCount / Math.max(sourceCount, 1);

        let gapSeverity: 'low' | 'medium' | 'high';
        if (ratio >= 0.3) gapSeverity = 'low';
        else if (ratio >= 0.1) gapSeverity = 'medium';
        else gapSeverity = 'high';

        return { domain: dc.domain, pageCount, sourceCount, gapSeverity };
      })
      .filter((g) => g.gapSeverity !== 'low');
  }

  /**
   * Find graph nodes with zero or one connection (sparse communities).
   */
  private async findSparseGraphNodes(
    graph: KnowledgeGraph | null,
  ): Promise<string[]> {
    if (!graph) return [];

    const connectionCounts = new Map<string, number>();
    for (const node of graph.nodes) {
      connectionCounts.set(node.id, 0);
    }
    for (const edge of graph.edges) {
      connectionCounts.set(
        edge.from,
        (connectionCounts.get(edge.from) || 0) + 1,
      );
      connectionCounts.set(edge.to, (connectionCounts.get(edge.to) || 0) + 1);
    }

    return [...connectionCounts.entries()]
      .filter(([, count]) => count <= 1)
      .map(([id]) => {
        const node = graph.nodes.find((n) => n.id === id);
        return node ? `${node.label} (${node.domain})` : id;
      });
  }

  private async appendLog(
    repoId: string,
    tenantId: string,
    result: LintResult,
  ): Promise<void> {
    const repoDir = path.join('backend', 'data-repos', repoId);
    try {
      await fs.mkdir(repoDir, { recursive: true });
    } catch {}
    const logPath = path.join(repoDir, 'log.md');
    const entry = `[${new Date().toISOString()}] LINT → ${result.totalIssues} issues: ${result.orphanPages.length} orphans, ${result.staleClaims.length} stale, ${result.missingCrossRefs.length} missing refs, ${result.sparseGraphNodes.length} sparse nodes, ${result.researchTriggered.length} research triggered\n`;
    await fs.appendFile(logPath, entry);
  }

  /**
   * Auto-trigger deep research when lint detects knowledge gaps.
   * Generates targeted search queries for high-severity gaps and sparse graph communities.
   */
  private async autoTriggerResearch(
    tenantId: string,
    gaps: LintResult['knowledgeGaps'],
    sparseNodes: string[],
    graph: KnowledgeGraph | null,
  ): Promise<{ domain: string; query: string }[]> {
    if (!this.researchQueue) {
      this.logger.debug(
        '[WikiLint] No research queue available — skipping auto-trigger',
      );
      return [];
    }

    const triggered: { domain: string; query: string }[] = [];

    // Trigger research for high-severity knowledge gaps
    const highGaps = gaps.filter((g) => g.gapSeverity === 'high');
    for (const gap of highGaps.slice(0, 3)) {
      const query = `${gap.domain} best practices rules policies procedures`;
      const jobId = crypto.randomUUID();

      await this.researchQueue.add(
        'research',
        {
          query,
          tenantId,
          jobId,
          domain: gap.domain,
        },
        { removeOnComplete: true },
      );

      triggered.push({ domain: gap.domain, query });
      this.logger.log(
        `[WikiLint] Auto-triggered research for gap domain: ${gap.domain}`,
      );
    }

    // Trigger research for isolated graph communities (sparse nodes)
    if (graph && sparseNodes.length > 0) {
      // Extract unique domains from sparse nodes
      const sparseDomains = new Set<string>();
      for (const nodeLabel of sparseNodes.slice(0, 5)) {
        const match = nodeLabel.match(/\(([^)]+)\)$/);
        if (match) sparseDomains.add(match[1]);
      }

      for (const domain of [...sparseDomains].slice(0, 2)) {
        // Skip if already triggered from knowledge gaps
        if (triggered.some((t) => t.domain === domain)) continue;

        const query = `${domain} relationships dependencies connections`;
        const jobId = crypto.randomUUID();

        await this.researchQueue.add(
          'research',
          {
            query,
            tenantId,
            jobId,
            domain,
          },
          { removeOnComplete: true },
        );

        triggered.push({ domain, query });
        this.logger.log(
          `[WikiLint] Auto-triggered research for sparse graph domain: ${domain}`,
        );
      }
    }

    return triggered;
  }
}
