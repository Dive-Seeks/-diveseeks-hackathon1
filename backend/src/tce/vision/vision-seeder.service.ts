import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { WikiPage } from '../../data-engine/entities/wiki-page.entity';
import { DataRepo } from '../../data-engine/entities/data-repo.entity';
import { VisionService } from './vision.service';
import { VisionFile } from './vision.types';

@Injectable()
export class VisionSeederService {
  private readonly logger = new Logger(VisionSeederService.name);

  constructor(
    @InjectRepository(WikiPage)
    private readonly wikiRepo: Repository<WikiPage>,
    @InjectRepository(DataRepo)
    private readonly dataRepoRepo: Repository<DataRepo>,
    private readonly visionService: VisionService,
  ) {}

  /**
   * Seeds project vision from Data Engine wiki pages.
   */
  async seedFromWiki(projectId: string, tenantId: string): Promise<VisionFile> {
    this.logger.log(
      `Seeding vision for project ${projectId} from data engine...`,
    );

    // 1. Fetch wiki pages
    const repo = await this.dataRepoRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (!repo) throw new Error('No data repo found for this tenant');

    const pages = await this.wikiRepo.find({ where: { repo_id: repo.id } });
    const fullContext = pages
      .map((p) => `[${p.title}]\n${p.content}`)
      .join('\n\n');

    // 2. Extract Vision using LLM
    const { object: extracted } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        name: z.string(),
        description: z.string(),
        techStack: z.object({
          locked: z.array(z.string()),
          forbidden: z.array(z.string()),
          frontend: z.array(z.string()),
          backend: z.array(z.string()),
          infra: z.array(z.string()),
        }),
        constraints: z.array(z.string()),
        goals: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
          }),
        ),
      }),
      prompt: `
        Analyze the following company wiki pages and extract the Project Vision for a new project.
        Look for:
        - Technical constraints (e.g. "must use PostgreSQL", "no external APIs")
        - Tech stack preferences
        - High-level business goals
        
        COMPANY WIKI:
        ${fullContext}
      `,
    });

    // 3. Create/Update Vision File
    let vision: VisionFile;
    const existing = await this.visionService.getVision(projectId);
    if (existing) {
      vision = existing;
    } else {
      vision = {
        projectId,
        name: extracted.name,
        description: extracted.description,
        techStack: extracted.techStack,
        constraints: extracted.constraints,
        goals: extracted.goals.map((g) => ({
          ...g,
          status: 'not_started',
          progress: 0,
          tasks: [],
        })),
        openQuestions: [],
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        version: 1,
      };
    }

    // Merge logic (prefer extracted but keep existing goals if any)
    vision.constraints = Array.from(
      new Set([...vision.constraints, ...extracted.constraints]),
    );
    vision.techStack = extracted.techStack;

    // Add new goals that don't exist yet
    for (const g of extracted.goals) {
      if (!vision.goals.find((vg) => vg.id === g.id)) {
        vision.goals.push({
          ...g,
          status: 'not_started',
          progress: 0,
          tasks: [],
        });
      }
    }

    await this.visionService.updateVision(projectId, vision);
    this.logger.log(`Vision seeded for project ${projectId}.`);
    return vision;
  }
}
