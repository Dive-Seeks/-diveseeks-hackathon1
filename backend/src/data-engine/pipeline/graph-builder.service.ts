import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WikiPage } from '../entities/wiki-page.entity';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

const GraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['Concept', 'Entity', 'Policy', 'Process', 'Source']),
      label: z.string(),
      domain: z.string(),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum([
        'DEFINES',
        'APPLIES_TO',
        'DEPENDS_ON',
        'CONTRADICTS',
        'SUPERSEDES',
        'RELATED_TO',
      ]),
      weight: z.number().min(0).max(5),
    }),
  ),
});

export type KnowledgeGraph = z.infer<typeof GraphSchema>;

@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async rebuild(repoId: string, tenantId: string): Promise<void> {
    const pages = await this.wikiPageRepo.find({
      where: { repo_id: repoId, tenant_id: tenantId },
    });
    if (pages.length === 0) return;

    const pagesSummary = pages
      .map((p) => `[${p.domain}] ${p.title}: ${p.content.substring(200, 600)}`)
      .join('\n\n');

    const { object } = await generateObject({
      model: this.aiRouter.getModel(AI_TASKS.FAST),
      schema: GraphSchema,
      system:
        'You are a knowledge graph builder. Extract entities, concepts, policies, processes and their relationships from wiki pages. Use the 4-signal relevance model: direct links weight=3, shared source weight=4, common neighbours weight=1.5, domain match weight=1.',
      prompt: `Build a knowledge graph from these wiki pages:\n\n${pagesSummary.substring(0, 4000)}`,
    });

    const graphPath = path.join(
      'backend',
      'data-repos',
      repoId,
      'knowledge-graph.json',
    );
    await fs.mkdir(path.dirname(graphPath), { recursive: true });
    await fs.writeFile(graphPath, JSON.stringify(object, null, 2));
    this.logger.log(
      `Graph rebuilt for repo ${repoId}: ${object.nodes.length} nodes, ${object.edges.length} edges`,
    );
  }

  async loadGraph(repoId: string): Promise<KnowledgeGraph | null> {
    const graphPath = path.join(
      'backend',
      'data-repos',
      repoId,
      'knowledge-graph.json',
    );
    try {
      const raw = await fs.readFile(graphPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
