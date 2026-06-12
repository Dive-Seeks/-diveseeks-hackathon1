import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VertexEmbeddingService } from '../../common/vertex-embedding.service';
import { WikiPage } from '../entities/wiki-page.entity';
import { DataRepo } from '../entities/data-repo.entity';
import { CONSTITUTION_TEMPLATE } from './spec-kit.templates';

@Injectable()
export class SpecKitFolderService {
  private readonly logger = new Logger(SpecKitFolderService.name);
  private root = process.cwd();

  // 60s in-memory cache — avoids re-reading same files on every Docs tab open (Karpathy SHA256 cache pattern)
  private readonly specFilesCache = new Map<
    string,
    { data: string | null; expires: number }
  >();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly vertexEmbed: VertexEmbeddingService,
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    @InjectRepository(DataRepo)
    private readonly dataRepoRepo: Repository<DataRepo>,
  ) {}

  private specifyDir(projectId: string): string {
    return path.join(this.root, 'memory', 'projects', projectId, '.specify');
  }

  async generateConstitution(projectId: string): Promise<void> {
    const [vision] = await this.eventEmitter.emitAsync(
      'vision.request',
      projectId,
    );
    const locked: string[] = vision?.techStack?.locked ?? [];
    const constraints: string[] = vision?.constraints ?? [];

    const content = CONSTITUTION_TEMPLATE.replace(
      '[PROJECT_NAME]',
      vision?.name ?? projectId,
    )
      .replace('[PRINCIPLES]', '- Generated from project vision.')
      .replace(
        '[TECH_STACK]',
        locked.map((t) => `- ${t}`).join('\n') || '- (none)',
      )
      .replace(
        '[CONSTRAINTS]',
        constraints.map((c) => `- ${c}`).join('\n') || '- (none)',
      )
      .replace('[VERSION]', '1.0.0')
      .replace('[LAST_AMENDED_DATE]', new Date().toISOString().slice(0, 10));

    const memoryDir = path.join(this.specifyDir(projectId), 'memory');
    await fs.mkdir(memoryDir, { recursive: true });
    await fs.writeFile(
      path.join(memoryDir, 'constitution.md'),
      content,
      'utf-8',
    );
    this.logger.log(
      `Generated .specify/memory/constitution.md for project ${projectId}`,
    );
  }

  async readSpecKitFileCached(
    projectId: string,
    relativePath: string,
  ): Promise<string | null> {
    const cacheKey = `${projectId}:${relativePath}`;
    const cached = this.specFilesCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    const data = await this.readSpecKitFile(projectId, relativePath);
    this.specFilesCache.set(cacheKey, { data, expires: Date.now() + 60_000 });
    return data;
  }

  async readSpecKitFile(
    projectId: string,
    relativePath: string,
  ): Promise<string | null> {
    const full = path.join(this.specifyDir(projectId), relativePath);
    try {
      return await fs.readFile(full, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeSpecKitFile(
    projectId: string,
    relativePath: string,
    content: string,
  ): Promise<void> {
    const full = path.join(this.specifyDir(projectId), relativePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
    // Invalidate cache so next read picks up the new content
    this.specFilesCache.delete(`${projectId}:${relativePath}`);
  }

  async appendSpecKitFile(
    projectId: string,
    relativePath: string,
    content: string,
  ): Promise<void> {
    const full = path.join(this.specifyDir(projectId), relativePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.appendFile(full, content, 'utf-8');
  }

  // Embeds spec.md content into wiki_pages so it is searchable via DataRepoSearchService.
  // Creates a DataRepo row with repo_type='spec' if one doesn't exist yet for the project.
  async embedSpecFile(
    projectId: string,
    tenantId: string,
    content: string,
  ): Promise<void> {
    try {
      // Upsert the spec DataRepo row
      let repo = await this.dataRepoRepo.findOne({
        where: { project_id: projectId, repo_type: 'spec' },
      });
      if (!repo) {
        repo = await this.dataRepoRepo.save(
          this.dataRepoRepo.create({
            tenant_id: tenantId,
            project_id: projectId,
            name: 'spec-kit',
            purpose: 'Auto-generated spec-kit artifacts',
            repo_type: 'spec',
            status: 'active',
          }),
        );
      }

      const embedding = await this.vertexEmbed.embed(
        content.substring(0, 2000),
      );

      // Upsert wiki page — one spec page per project, domain='spec'
      const existing = await this.wikiPageRepo.findOne({
        where: { repo_id: repo.id, tenant_id: tenantId, domain: 'spec' },
      });
      const page =
        existing ??
        this.wikiPageRepo.create({
          repo_id: repo.id,
          tenant_id: tenantId,
        });
      page.path = `spec-kit/${projectId}/spec`;
      page.title = 'Feature Specification';
      page.domain = 'spec';
      page.content = content;
      page.source_ids = [projectId];
      page.confidence = 1.0;
      page.embedding = embedding.map(Number);

      await this.wikiPageRepo.save(page);
      this.logger.log(
        `[SpecKit] spec.md embedded into wiki_pages for project ${projectId}`,
      );
    } catch (err) {
      this.logger.warn(
        `[SpecKit] embedSpecFile failed (non-fatal): ${(err as Error).message}`,
      );
    }
  }
}
