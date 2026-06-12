import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateObject } from 'ai';
import { VertexEmbeddingService } from '../../common/vertex-embedding.service';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WikiPage } from '../entities/wiki-page.entity';
import { Extraction } from '../entities/extraction.entity';
import { DataRepo } from '../entities/data-repo.entity';
import { ContradictionResult } from './contradiction-detector.service';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

const WikiPageSchema = z.object({
  title: z.string().max(120),
  path: z
    .string()
    .max(255)
    .regex(/^[a-z0-9-/]+$/),
  content: z.string(),
  wikilinks: z.array(z.string()),
});

@Injectable()
export class WikiCompilerService {
  private readonly logger = new Logger(WikiCompilerService.name);

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    @InjectRepository(Extraction)
    private readonly extractionRepo: Repository<Extraction>,
    @InjectRepository(DataRepo)
    private readonly repoRepo: Repository<DataRepo>,
    private readonly aiRouter: AiProviderRouter,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {}

  async compile(
    repoId: string,
    tenantId: string,
    results: ContradictionResult[],
    sourceId: string,
  ): Promise<WikiPage[]> {
    const accepted = results.filter((r) => r.isNew);
    if (accepted.length === 0) return [];

    // Load repo schema for wiki conventions
    const repo = await this.repoRepo.findOne({ where: { id: repoId } });
    const schema = repo?.schema || null;

    // Group by domain
    const byDomain = new Map<string, ContradictionResult[]>();
    for (const r of accepted) {
      const d = r.claim.domain;
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(r);
    }

    const pages: WikiPage[] = [];
    for (const [domain, domainResults] of byDomain.entries()) {
      const page = await this.compileWikiPage(
        repoId,
        tenantId,
        domain,
        domainResults,
        sourceId,
        schema,
      );
      if (page) pages.push(page);
    }

    await this.updateIndex(repoId, tenantId, pages);
    await this.appendLog(
      repoId,
      tenantId,
      accepted.length,
      results.filter((r) => !r.isNew).length,
    );

    return pages;
  }

  private async compileWikiPage(
    repoId: string,
    tenantId: string,
    domain: string,
    results: ContradictionResult[],
    sourceId: string,
    schema: string | null,
  ): Promise<WikiPage | null> {
    const claimsText = results
      .map(
        (r) =>
          `- ${r.claim.claim} (confidence: ${r.claim.confidence.toFixed(2)}, source: "${r.claim.sourceQuote}")`,
      )
      .join('\n');

    const { object } = await generateObject({
      model: this.aiRouter.getModel(AI_TASKS.FAST),
      schema: WikiPageSchema,
      system: `You are a wiki writer. Compile extracted business knowledge claims into a clean, well-structured markdown wiki page with citations. Use [[wikilink]] syntax for cross-references. Every factual statement must trace to a source quote.${schema ? `\n\nWIKI SCHEMA (follow these conventions):\n${schema}` : ''}`,
      prompt: `Domain: ${domain}\n\nExtracted claims:\n${claimsText}\n\nWrite a wiki page that organises these facts clearly. Include source quotes as citations.`,
    });

    const avgConfidence =
      results.reduce((s, r) => s + r.claim.confidence, 0) / results.length;

    const frontmatter = `---\nsources: ["${sourceId}"]\nconfidence: ${avgConfidence.toFixed(2)}\nlastUpdated: "${new Date().toISOString().split('T')[0]}"\ndomain: ${domain}\n---\n\n`;
    const fullContent = frontmatter + object.content;

    // Embed for future retrieval
    const embedding = await this.vertexEmbed.embed(
      object.content.substring(0, 2000),
    );

    // Save extractions to DB
    for (const r of results) {
      const extraction = this.extractionRepo.create({
        repo_id: repoId,
        source_id: sourceId,
        tenant_id: tenantId,
        claim: r.claim.claim,
        confidence: r.claim.confidence,
        source_page: r.claim.sourcePage,
        source_quote: r.claim.sourceQuote,
        domain,
        entity_refs: r.claim.entityRefs,
        contradicts: r.contradictedIds,
        status: 'accepted',
      });
      await this.extractionRepo.save(extraction);
    }

    // Upsert wiki page
    const existing = await this.wikiPageRepo.findOne({
      where: { repo_id: repoId, tenant_id: tenantId, domain },
    });
    const page =
      existing ??
      this.wikiPageRepo.create({ repo_id: repoId, tenant_id: tenantId });
    page.path = object.path;
    page.title = object.title;
    page.domain = domain;
    page.content = fullContent;
    page.source_ids = [...new Set([...(page.source_ids ?? []), sourceId])];
    page.confidence = avgConfidence;
    page.embedding = embedding.map(Number);

    return this.wikiPageRepo.save(page);
  }

  private async updateIndex(
    repoId: string,
    tenantId: string,
    pages: WikiPage[],
  ) {
    const repoDir = path.join('backend', 'data-repos', repoId);
    await fs.mkdir(repoDir, { recursive: true });
    const indexPath = path.join(repoDir, 'index.md');

    let existing = '';
    try {
      existing = await fs.readFile(indexPath, 'utf8');
    } catch {}

    for (const page of pages) {
      const entry = `| ${page.path} | ${page.title} | ${page.confidence.toFixed(2)} | ${page.domain} |\n`;
      if (!existing.includes(page.path)) existing += entry;
    }
    await fs.writeFile(indexPath, existing);
  }

  private async appendLog(
    repoId: string,
    tenantId: string,
    accepted: number,
    contradicted: number,
  ) {
    const repoDir = path.join('backend', 'data-repos', repoId);
    await fs.mkdir(repoDir, { recursive: true });
    const logPath = path.join(repoDir, 'log.md');
    const entry = `[${new Date().toISOString()}] INGEST → ${accepted} claims accepted, ${contradicted} contradictions flagged\n`;
    await fs.appendFile(logPath, entry);
  }
}
