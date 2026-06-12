import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TCETask } from '../entities/tce-task.entity';
import { VisionService } from '../vision/vision.service';
import { ProgressService } from './progress.service';
import { TceScheduler } from '../tce.scheduler';
import { SalesGateway } from '../../gateways/sales/sales.gateway';

@Injectable()
export class GoalTrackerService {
  private readonly logger = new Logger(GoalTrackerService.name);

  constructor(
    @InjectRepository(TCETask)
    private readonly taskRepo: Repository<TCETask>,
    private readonly visionService: VisionService,
    private readonly progressService: ProgressService,
    @Inject(forwardRef(() => TceScheduler))
    private readonly tceScheduler: TceScheduler,
    private readonly salesGateway: SalesGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onTaskCompleted(projectId: string, goalId: string): Promise<void> {
    const vision = await this.visionService.getVision(projectId);
    if (!vision) return;
    const goal = vision.goals.find((g) => g.id === goalId);
    if (!goal) return;

    const tasks = await this.taskRepo.find({ where: { projectId, goalId } });
    const progress = this.progressService.calculateGoalProgress(goal, tasks);

    goal.progress = progress;

    if (progress === 100) {
      goal.status = 'complete';
      goal.completedAt = new Date().toISOString();
      await this.visionService.updateVision(projectId, {
        ...vision,
        goals: vision.goals,
      });

      this.salesGateway.server.emit('goal_complete', {
        projectId,
        goalId: goal.id,
        goalTitle: goal.title,
        message: `Goal ${goal.id} complete — ${goal.title} ✓`,
      });
      this.logger.log(`Goal ${goal.id} complete for project ${projectId}`);

      await this.tceScheduler.triggerOnGoalComplete(projectId);

      const allComplete = vision.goals.every((g) => g.status === 'complete');
      if (allComplete) {
        this.eventEmitter.emit('project_goals_completed', {
          projectId,
          tenantId: tasks[0]?.tenantId ?? 'default',
        });
      }
    } else {
      goal.status = progress > 0 ? 'in_progress' : goal.status;
      await this.visionService.updateVision(projectId, {
        ...vision,
        goals: vision.goals,
      });
    }
  }
}
