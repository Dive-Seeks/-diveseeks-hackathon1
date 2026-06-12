import { Injectable } from '@nestjs/common';
import { VisionFile } from './vision.types';

export type ConflictType =
  | 'STACK_CONFLICT'
  | 'GOAL_CONFLICT'
  | 'CONSTRAINT_CONFLICT'
  | 'SCOPE_CONFLICT'
  | 'VALID_IMPROVEMENT'
  | 'ALIGNED';

@Injectable()
export class VisionConflictService {
  classifyMessage(
    message: string,
    vision: VisionFile,
  ): { type: ConflictType; match?: string; details?: any } {
    const lowerMsg = message.toLowerCase();

    // 1. Check forbidden stack (SCOPE_CONFLICT / STACK_CONFLICT)
    const forbiddenList = vision.techStack?.forbidden || [];
    for (const forbidden of forbiddenList) {
      if (lowerMsg.includes(forbidden.toLowerCase())) {
        return { type: 'STACK_CONFLICT', match: forbidden };
      }
    }

    // 2. Check locked stack (STACK_CONFLICT)
    const replacementWords = [
      'replace',
      'switch',
      'migrate',
      'instead of',
      'remove',
    ];
    const lockedList = vision.techStack?.locked || [];
    for (const locked of lockedList) {
      if (
        lowerMsg.includes(locked.toLowerCase()) &&
        replacementWords.some((w) => lowerMsg.includes(w))
      ) {
        return { type: 'STACK_CONFLICT', match: locked };
      }
    }

    // 3. Check constraints (CONSTRAINT_CONFLICT)
    const constraintList = vision.constraints || [];
    for (const constraint of constraintList) {
      if (this.contradicts(lowerMsg, constraint)) {
        return { type: 'CONSTRAINT_CONFLICT', match: constraint };
      }
    }

    // 4. Check goal conflicts (GOAL_CONFLICT)
    // Heuristic: if user wants to delete or stop a goal
    const goalStopWords = ['stop', 'delete', 'cancel', 'remove', 'abandon'];
    const goalList = vision.goals || [];
    for (const goal of goalList) {
      if (
        goalStopWords.some((w) => lowerMsg.includes(w)) &&
        goal.title
          .toLowerCase()
          .split(' ')
          .some((w) => w.length > 3 && lowerMsg.includes(w))
      ) {
        return {
          type: 'GOAL_CONFLICT',
          match: goal.id,
          details: { goalTitle: goal.title, progress: goal.progress },
        };
      }
    }

    // 5. Check if it serves an existing goal (ALIGNED)
    for (const goal of goalList) {
      if (this.serves(lowerMsg, goal)) {
        return { type: 'ALIGNED', match: goal.id };
      }
    }

    // 6. No conflict but not in vision (VALID_IMPROVEMENT)
    return { type: 'VALID_IMPROVEMENT' };
  }

  private contradicts(message: string, constraint: string): boolean {
    const constraintWords = constraint
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 3);
    const hasConstraintTopics = constraintWords.some((w) =>
      message.includes(w),
    );
    // Word-boundary match — substring matching flagged words like
    // "announce"/"now" (contain "no") as negations.
    const hasNegation = /\b(no|not|stop|disable|don'?t|never)\b/.test(message);
    return hasConstraintTopics && hasNegation;
  }

  private serves(message: string, goal: any): boolean {
    const titleWords = goal.title
      .toLowerCase()
      .split(' ')
      .filter((w: string) => w.length > 3);
    return titleWords.some((w: string) => message.includes(w));
  }

  getResponseTemplate(
    conflictType: ConflictType,
    context: any,
  ): { response: string; alternatives?: string[] } {
    switch (conflictType) {
      case 'STACK_CONFLICT':
        return {
          response: `Your vision locks ${context.locked || '[locked]'} as the tool and forbids ${context.forbidden || '[forbidden]'}.\nSwitching would conflict with existing patterns.`,
          alternatives: [
            `A) You want a feature of ${context.forbidden || 'the forbidden tool'}? → I can improve ${context.locked || 'the locked tool'} setup to match.`,
            `B) You genuinely want to migrate? → This requires a vision change. Shall I update the vision and create a migration plan?`,
          ],
        };
      case 'GOAL_CONFLICT':
        return {
          response: `This conflicts with Goal ${context.goalId}: ${context.goalTitle}.\nYour team is currently ${context.progress}% through this goal.`,
          alternatives: [
            `A) You want to modify Goal ${context.goalId}? → I'll update the goal description and adjust tasks.`,
            `B) This is a separate new goal? → I'll add it as a new Goal alongside the existing one.`,
          ],
        };
      case 'VALID_IMPROVEMENT':
        return {
          response: `This isn't in your current vision but doesn't conflict with anything.`,
          alternatives: [
            `A) Add this as a new goal to your vision? → Your team will see the update immediately.`,
            `B) Treat this as a one-off task (not added to vision)? → Done once, not tracked as a goal.`,
          ],
        };
      case 'CONSTRAINT_CONFLICT':
        return {
          response: `This violates a project constraint: "${context.constraint}".`,
        };
      case 'ALIGNED':
      default:
        return { response: '' };
    }
  }
}
