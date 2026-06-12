import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { VisionService } from '../tce/vision/vision.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class GoalProgressService {
  constructor(
    @InjectRepository(TaskPrdFeatureMap)
    private readonly mapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    private readonly visionService: VisionService,
    private readonly salesGateway: SalesGateway,
  ) {}

  async recompute(projectId: string, goalId: string): Promise<void> {
    const sessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where("s.context->'goalAncestry'->>'goalId' = :goalId", { goalId })
      .andWhere('s.projectId = :projectId', { projectId })
      .getMany();

    const featureMaps = await this.mapRepo.find({
      where: { taskSessionId: In(sessions.map((s) => s.id)) },
    });

    let totalReqs = 0;
    let totalSatisfied = 0;
    for (const m of featureMaps) {
      totalReqs += m.totalRequirements;
      totalSatisfied += m.satisfiedRequirements;
    }
    const progress =
      totalReqs === 0 ? 0 : Math.round((totalSatisfied / totalReqs) * 100);

    const vision = await this.visionService.getVision(projectId);
    if (!vision) return;
    const goal = vision.goals.find((g) => g.id === goalId);
    if (!goal) return;
    goal.progress = progress;
    if (progress >= 100) goal.status = 'complete';
    await this.visionService.updateVision(projectId, vision);

    this.salesGateway.server.emit('goal_progress_updated', {
      goalId,
      progress,
      status: goal.status,
    });
    this.salesGateway.server.emit('vision_updated', { projectId });
  }
}
