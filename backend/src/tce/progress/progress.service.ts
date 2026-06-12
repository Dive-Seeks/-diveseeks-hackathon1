import { Injectable } from '@nestjs/common';
import { VisionGoal } from '../vision/vision.types';
import { TCETask } from '../entities/tce-task.entity';

@Injectable()
export class ProgressService {
  calculateGoalProgress(goal: VisionGoal, tasks: TCETask[]): number {
    const goalTasks = tasks.filter((t) => t.goalId === goal.id);
    if (goalTasks.length === 0) return 0;

    const done = goalTasks.filter((t) => t.status === 'done').length;
    return Math.round((done / goalTasks.length) * 100);
  }
}
