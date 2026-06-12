import { Injectable } from '@nestjs/common';
import type {
  ProjectCompletionCard,
  ProjectCompletionChecklist,
} from './project-lifecycle.types';

export interface ProjectCompletionReviewResult {
  passed: boolean;
  status:
    | 'not_ready'
    | 'needs_review'
    | 'needs_user_approval'
    | 'complete'
    | 'blocked';
  summary: string;
  missing: string[];
  checklist: ProjectCompletionChecklist;
}

@Injectable()
export class ProjectCompletionReviewService {
  evaluate(card: ProjectCompletionCard): ProjectCompletionReviewResult {
    const c = card.checklist;
    const missing: string[] = [];

    if (!c.noBlockedTasks) missing.push('noBlockedTasks');
    if (!c.allTasksTerminal) missing.push('allTasksTerminal');
    if (!c.allGoalsComplete) missing.push('allGoalsComplete');
    if (!c.requiredDocsPresent) missing.push('requiredDocsPresent');
    if (!c.coordinatorReviewed) missing.push('coordinatorReviewed');
    if (!c.finalSummaryReady) missing.push('finalSummaryReady');

    if (missing.includes('noBlockedTasks')) {
      return {
        passed: false,
        status: 'blocked',
        summary: 'Project has blocked tasks.',
        missing,
        checklist: c,
      };
    }
    if (missing.includes('allTasksTerminal')) {
      return {
        passed: false,
        status: 'not_ready',
        summary: 'Agents are still working.',
        missing,
        checklist: c,
      };
    }
    if (
      missing.includes('coordinatorReviewed') ||
      missing.includes('finalSummaryReady')
    ) {
      return {
        passed: false,
        status: 'needs_review',
        summary: 'Coordinator review is pending.',
        missing,
        checklist: c,
      };
    }
    if (missing.length > 0) {
      return {
        passed: false,
        status: 'needs_review',
        summary: `Missing: ${missing.join(', ')}.`,
        missing,
        checklist: c,
      };
    }

    const taskCount = card.tasks.length;
    const goalCount = card.goals.length;
    const summary = `I reviewed the project. ${taskCount} tasks are done, 0 are blocked, ${goalCount} goals are complete, and the final documents are ready. Please approve or ask for an update.`;
    return {
      passed: true,
      status: 'needs_user_approval',
      summary,
      missing: [],
      checklist: c,
    };
  }
}
