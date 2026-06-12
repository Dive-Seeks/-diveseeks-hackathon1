import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import type { ProjectCompletionCard } from './project-lifecycle.types';

@Injectable()
export class ProjectMemoryService {
  private readonly logger = new Logger(ProjectMemoryService.name);

  constructor(
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {}

  async writeCompletionEpisode(
    tenantId: string,
    projectId: string,
    card: ProjectCompletionCard,
  ): Promise<void> {
    const summary =
      card.summary || `Project ${projectId} completed successfully.`;
    const keywords = ['project_completed', projectId, card.status];

    let embedding: number[] | null = null;
    try {
      embedding = await this.vertexEmbed.embed(summary);
    } catch (e) {
      this.logger.warn(
        `Vertex embed failed for project completion ${projectId}: ${(e as Error).message}`,
      );
    }

    const episode = this.episodeRepo.create({
      tenantId,
      domain: 'coding', // default team
      ownerType: 'project',
      ownerId: projectId,
      episodeType: 'project_completed',
      keywords,
      summary,
      embedding,
    });

    await this.episodeRepo.save(episode);
    this.logger.log(`Wrote memory episode for completed project ${projectId}`);
  }
}
