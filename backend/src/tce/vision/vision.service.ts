import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiveSeeksProject } from '../entities/diveseeks-project.entity';
import { VisionFile, VisionChatMessage, VisionGoal } from './vision.types';
import { VisionDocumentRenderer } from './vision-document-renderer';
import { TokenizerService } from '../../tokenizer/tokenizer.service';
import { VertexEmbeddingService } from '../../common/vertex-embedding.service';
import { KnowledgeStoreService } from '../../knowledge-store/knowledge-store.service';

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly renderer = new VisionDocumentRenderer();
  private readonly _cache = new Map<
    string,
    { value: any; expiresAt: number }
  >();

  constructor(
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    private readonly tokenizerService: TokenizerService,
    private readonly vertexEmbedding: VertexEmbeddingService,
    private readonly knowledgeStore: KnowledgeStoreService,
  ) {}

  private getCached<T>(key: string): T | null {
    const cached = this._cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this._cache.delete(key);
      return null;
    }
    return cached.value as T;
  }

  private setCached<T>(key: string, value: T, ttlMs: number): void {
    this._cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  @OnEvent('vision.request')
  async getVision(projectId: string): Promise<VisionFile | null> {
    const cached = this.getCached<VisionFile>(projectId);
    if (cached) return cached;

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'visionFile'],
    });
    if (!project?.visionFile) return null;

    const vision = project.visionFile;
    if (this.ensureGoalIds(vision)) {
      vision.version = (vision.version || 0) + 1;
      vision.lastUpdatedAt = new Date().toISOString();
      await this.projectRepo.update({ id: projectId }, { visionFile: vision });
    }

    this.setCached(projectId, vision, 5 * 60 * 1000);
    return vision;
  }

  async updateVision(
    projectId: string,
    vision: VisionFile,
  ): Promise<VisionFile> {
    this.ensureGoalIds(vision);
    vision.version = (vision.version || 0) + 1;
    vision.lastUpdatedAt = new Date().toISOString();

    await this.projectRepo.update({ id: projectId }, { visionFile: vision });
    this.setCached(projectId, vision, 5 * 60 * 1000);

    // Index for semantic retrieval — fire and await (vision updates are infrequent)
    await this.indexVision(projectId, vision).catch((err) =>
      this.logger.error(
        `[VisionService] indexVision failed for projectId ${projectId}: ${err?.message}`,
        err instanceof Error ? err.stack : String(err),
      ),
    );

    return vision;
  }

  private ensureGoalIds(vision: VisionFile): boolean {
    if (!Array.isArray(vision.goals)) {
      vision.goals = [];
      return true;
    }
    let changed = false;
    const seen = new Set<string>();
    for (const [index, goal] of vision.goals.entries()) {
      if (!goal.id || seen.has(goal.id)) {
        const specKitId = `REQ-${String(index + 1).padStart(3, '0')}`;
        goal.id = !seen.has(specKitId) ? specKitId : randomUUID();
        changed = true;
      }
      seen.add(goal.id);
    }
    return changed;
  }

  private async indexVision(
    projectId: string,
    vision: VisionFile,
  ): Promise<void> {
    // 1. Soft-delete stale chunks for this project
    await this.knowledgeStore.softDeleteBySource(`vision://${projectId}`);

    // 2. Render to spec-kit markdown
    const markdown = this.renderer.render(vision);

    // 3. Chunk with 512-token window, 64-token overlap
    const chunks = this.tokenizerService.chunk(markdown, 512, 64);

    // 4. Embed + store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.vertexEmbedding.embed(chunks[i]);
      await this.knowledgeStore.store({
        content: chunks[i],
        tokenCount: this.tokenizerService.countTokens(chunks[i]),
        sourceUrl: `vision://${projectId}`,
        tenantId: projectId,
        researchJobId: `vision-${projectId}`,
        webChunkId: `vision-${projectId}-${i}`,
        embedding,
        chunkIndex: i,
      });
    }
  }

  private getChatFilePath(projectId: string): string {
    return `/tmp/chat-${projectId}.json`;
  }

  async appendChatMessages(
    projectId: string,
    messages: VisionChatMessage[],
  ): Promise<void> {
    const filePath = this.getChatFilePath(projectId);
    let existing: VisionChatMessage[] = [];
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(raw) as VisionChatMessage[];
    } catch (err: unknown) {
      this.logger.error(
        `[VisionService] Failed to read chat history for projectId ${projectId}`,
        err instanceof Error ? err.stack : String(err),
      );
      // ENOENT or parse error — start fresh
    }
    // Cap at 20 turns (last 10 exchanges) — prevents unbounded growth across sessions
    const MAX_TURNS = 20;
    const updated = [...existing, ...messages].slice(-MAX_TURNS);
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(updated, null, 2), 'utf-8');
    await fs.rename(tmp, filePath);
  }

  async getChatHistory(projectId: string): Promise<VisionChatMessage[]> {
    const filePath = this.getChatFilePath(projectId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as VisionChatMessage[];
    } catch (err: unknown) {
      this.logger.error(
        `[VisionService] Failed to read chat history for projectId ${projectId}`,
        err instanceof Error ? err.stack : String(err),
      );
      return [];
    }
  }

  async addOrUpdateGoal(
    projectId: string,
    goalInput: Omit<VisionGoal, 'tasks' | 'progress'>,
  ): Promise<{ goalId: string; tasksCreated: number }> {
    const vision = await this.getVision(projectId);
    if (!vision)
      throw new NotFoundException(`Vision not found for project ${projectId}`);

    const existingIndex = vision.goals.findIndex((g) => g.id === goalInput.id);
    if (existingIndex >= 0) {
      vision.goals[existingIndex] = {
        ...vision.goals[existingIndex],
        ...goalInput,
      };
    } else {
      vision.goals.push({
        id: goalInput.id,
        title: goalInput.title,
        description: goalInput.description,
        status: goalInput.status || 'pending',
        tasks: [],
        progress: 0,
      });
    }

    await this.updateVision(projectId, vision);

    // Defer task creation logic to TCE orchestrator
    return { goalId: goalInput.id, tasksCreated: 0 };
  }
}
