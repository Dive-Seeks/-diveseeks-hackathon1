import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { DATA_ENGINE_QUEUE, DataEngineJobs } from './data-engine.queue';
import { DataRepo } from './entities/data-repo.entity';
import { SourceDocument } from './entities/source-document.entity';
import { WikiPage } from './entities/wiki-page.entity';
import { Extraction } from './entities/extraction.entity';
import { CreateRepoDto } from './dto/create-repo.dto';
import { ResolveContradictionDto } from './dto/resolve-contradiction.dto';
import { QueryRepoDto } from './dto/query-repo.dto';
import { DataRepoSearchService } from './retrieval/data-repo-search.service';

@Injectable()
export class DataEngineService {
  constructor(
    @InjectRepository(DataRepo) private readonly repoRepo: Repository<DataRepo>,
    @InjectRepository(SourceDocument)
    private readonly sourceRepo: Repository<SourceDocument>,
    @InjectRepository(WikiPage)
    private readonly wikiPageRepo: Repository<WikiPage>,
    @InjectRepository(Extraction)
    private readonly extractionRepo: Repository<Extraction>,
    @InjectQueue(DATA_ENGINE_QUEUE) private readonly queue: Queue,
    private readonly search: DataRepoSearchService,
  ) {}

  async createRepo(tenantId: string, dto: CreateRepoDto) {
    try {
      const repo = this.repoRepo.create({
        tenant_id: tenantId,
        project_id: dto.project_id,
        name: dto.name,
        purpose: dto.purpose,
      });
      return await this.repoRepo.save(repo);
    } catch (e) {
      console.error('[DataEngineService] createRepo failed:', e);
      throw e;
    }
  }

  async listRepos(tenantId: string) {
    return this.repoRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async getRepo(tenantId: string, repoId: string) {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, tenant_id: tenantId },
    });
    if (!repo) throw new NotFoundException('Data repo not found');
    return repo;
  }

  async uploadDocument(
    tenantId: string,
    repoId: string,
    file: Express.Multer.File,
  ) {
    await this.getRepo(tenantId, repoId);

    const buffer = await fs.readFile(file.path);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // SHA-256 dedup — skip if already processed
    const existing = await this.sourceRepo.findOne({
      where: { repo_id: repoId, sha256 },
    });
    if (existing)
      return {
        skipped: true,
        reason: 'File already processed',
        sourceId: existing.id,
      };

    const source = await this.sourceRepo.save(
      this.sourceRepo.create({
        repo_id: repoId,
        tenant_id: tenantId,
        sha256,
        filename: file.originalname,
        mime_type: file.mimetype,
        status: 'pending',
      }),
    );

    await this.queue.add(DataEngineJobs.PROCESS_DOCUMENT, {
      sourceId: source.id,
      filePath: file.path,
      repoId,
      tenantId,
    });

    return { sourceId: source.id, status: 'queued' };
  }

  async getContradictions(tenantId: string, repoId: string) {
    await this.getRepo(tenantId, repoId);
    return this.extractionRepo.find({
      where: {
        repo_id: repoId,
        tenant_id: tenantId,
        status: 'contradicted',
      },
      order: { created_at: 'DESC' },
    });
  }

  async resolveContradiction(
    tenantId: string,
    repoId: string,
    dto: ResolveContradictionDto,
  ) {
    const extraction = await this.extractionRepo.findOne({
      where: { id: dto.extraction_id, repo_id: repoId, tenant_id: tenantId },
    });
    if (!extraction) throw new NotFoundException('Extraction not found');

    const newStatus = dto.resolution === 'keep_old' ? 'rejected' : 'resolved';
    await this.extractionRepo.update(dto.extraction_id, {
      status: newStatus,
      resolution_note: dto.note,
    });
    await this.repoRepo.decrement({ id: repoId }, 'pending_contradictions', 1);
    return { resolved: true };
  }

  async queryRepo(tenantId: string, repoId: string, dto: QueryRepoDto) {
    await this.getRepo(tenantId, repoId);
    const results = await this.search.search(
      repoId,
      tenantId,
      dto.query,
      dto.domain,
      dto.top_k ?? 5,
    );
    return { results, totalFound: results.length };
  }

  async listPages(tenantId: string, repoId: string) {
    await this.getRepo(tenantId, repoId);
    return this.wikiPageRepo.find({
      where: { repo_id: repoId, tenant_id: tenantId },
      select: ['id', 'path', 'title', 'domain', 'confidence', 'updated_at'],
      order: { domain: 'ASC', title: 'ASC' },
    });
  }

  async getRepoSchema(
    tenantId: string,
    repoId: string,
  ): Promise<{ schema: string | null }> {
    const repo = await this.repoRepo.findOne({
      where: { id: repoId, tenant_id: tenantId },
    });
    if (!repo) throw new NotFoundException(`Repo ${repoId} not found`);
    return { schema: repo.schema ?? null };
  }

  async updateRepoSchema(
    tenantId: string,
    repoId: string,
    schema: string,
  ): Promise<{ success: boolean }> {
    const result = await this.repoRepo.update(
      { id: repoId, tenant_id: tenantId },
      { schema },
    );
    if (result.affected === 0)
      throw new NotFoundException(`Repo ${repoId} not found`);
    return { success: true };
  }

  async listDocuments(tenantId: string, repoId: string) {
    await this.getRepo(tenantId, repoId);
    return this.sourceRepo.find({
      where: { repo_id: repoId, tenant_id: tenantId },
      order: { uploaded_at: 'DESC' },
    });
  }
}
