import { Injectable } from '@nestjs/common';
import { VisionGoal } from '../vision/vision.types';
import { Gap } from './gap-analyzer.service';

@Injectable()
export class PriorityScorerService {
  scorePriority(goal: VisionGoal, gap: Gap): number {
    let score = 0;

    if (goal.status === 'not_started') score += 30; // highest — unstarted goals
    if (goal.status === 'in_progress') score += 20; // continue momentum
    if (goal.progress === 0) score += 20; // nothing done yet

    if (gap.blocksOtherGoals) score += 25; // unblocks something
    if (gap.isSecurityRelated) score += 15; // security always prioritised

    return Math.min(score, 100);
  }
}
