import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskTrajectory } from './entities/task-trajectory.entity';

export interface TrajectoryWriteParams {
  tenantId: string;
  specialistId: string;
  team: string;
  taskDescription: string;
  outcome: 'pass' | 'fail' | 'needs_review';
  featureMapId?: string;
  modelProvider?: string;
  modelId?: string;
  wasUserModel?: boolean;
  predictionConfidence?: number;
  predictionBasis?: string;
  predictionMeta?: any;
  // Brain memory enrichment (Phase 4)
  emotionTag?: 'satisfaction' | 'sadness' | 'fear' | 'anger' | 'neutral';
  failureClass?: 'prd_miss' | 'correction' | 'blocked' | 'quality' | null;
  criteriaMetCount?: number;
  criteriaUnmetCount?: number;
  iterationCount?: number;
}

@Injectable()
export class TrajectoryWriterService {
  private readonly logger = new Logger(TrajectoryWriterService.name);

  constructor(
    @InjectRepository(TaskTrajectory)
    private readonly repo: Repository<TaskTrajectory>,
  ) {}

  async write(params: TrajectoryWriteParams): Promise<TaskTrajectory | null> {
    try {
      this.logger.log(
        `[TrajectoryWriter] ${params.specialistId} (${params.outcome}) tenant=${params.tenantId}`,
      );
      const row = this.repo.create({
        tenantId: params.tenantId,
        specialistId: params.specialistId,
        team: params.team,
        taskDescription: params.taskDescription.substring(0, 1000),
        outcome: params.outcome,
        approved:
          params.outcome === 'pass' || params.outcome === 'needs_review',
        featureMapId: params.featureMapId ?? null,
        modelProvider: params.modelProvider ?? null,
        modelId: params.modelId ?? null,
        wasUserModel: params.wasUserModel ?? false,
        predictionConfidence: params.predictionConfidence ?? null,
        predictionBasis: params.predictionBasis ?? null,
        predictionMeta: params.predictionMeta ?? null,
        emotionTag: params.emotionTag ?? null,
        failureClass: params.failureClass ?? null,
        criteriaMetCount: params.criteriaMetCount ?? null,
        criteriaUnmetCount: params.criteriaUnmetCount ?? null,
        iterationCount: params.iterationCount ?? null,
      });
      return await this.repo.save(row);
    } catch (err) {
      this.logger.error(
        `[TrajectoryWriter] Failed tenant=${params.tenantId} specialist=${params.specialistId}`,
        (err as Error).stack,
      );
      return null;
    }
  }
}
