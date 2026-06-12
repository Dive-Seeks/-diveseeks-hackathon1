import { Injectable } from '@nestjs/common';
import { VisionGoal, VisionFile } from '../vision/vision.types';

export interface DecomposedTask {
  title: string;
  description: string;
  specialist: string;
  alsoSpecialist?: string;
}

/** Single source of truth for team → valid specialist set and team default. */
export const TEAM_SPECIALISTS: Record<string, readonly string[]> = {
  general: [
    'quest',
    'echo',
    'lyra',
    'spark',
    'zoe',
    'gist',
    'memo',
    'tran',
    'plan',
    'vibe',
  ],
  research: [
    'lit',
    'cite',
    'hypo',
    'peer',
    'scribe',
    'tutor',
    'prof',
    'grant',
    'data',
    'synth',
  ],
  coding: [
    'rex',
    'nova',
    'kai',
    'sage',
    'pixel',
    'luma',
    'orion',
    'felix',
    'atlas',
    'vex',
  ],
};

export const TEAM_DEFAULTS: Record<string, string> = {
  general: 'quest',
  research: 'lit',
  coding: 'rex',
};

@Injectable()
export class GoalDecomposerService {
  /**
   * Decomposes a vision goal into actionable tasks whose specialists
   * are constrained to the valid set for the project's team.
   *
   * @param team  'general' | 'research' | 'coding' — defaults to 'coding' when absent
   *              so legacy callers that don't yet pass team remain backward-compatible.
   */
  decomposeGoal(
    goal: VisionGoal,
    vision: VisionFile,
    gapDescription: string,
    taskSizeMultiplier: number,
    team?: string,
  ): DecomposedTask[] {
    const resolvedTeam = team ?? 'coding';
    const validSet = new Set(
      TEAM_SPECIALISTS[resolvedTeam] ?? TEAM_SPECIALISTS['coding'],
    );
    const defaultSpecialist = TEAM_DEFAULTS[resolvedTeam] ?? 'rex';

    /** Clamp a desired specialist to the team's valid set, falling back to the team default. */
    const clamp = (desired: string, fallback?: string): string => {
      if (validSet.has(desired)) return desired;
      if (fallback && validSet.has(fallback)) return fallback;
      return defaultSpecialist;
    };

    const tasks: DecomposedTask[] = [];

    if (resolvedTeam === 'coding') {
      // Software-engineering decomposition (unchanged behaviour for coding projects)
      const isFrontend = vision.techStack.frontend.some((tech) =>
        goal.description.toLowerCase().includes(tech),
      );
      const isBackend = vision.techStack.backend.some((tech) =>
        goal.description.toLowerCase().includes(tech),
      );
      const isSecurity =
        goal.title.toLowerCase().includes('security') ||
        goal.title.toLowerCase().includes('auth');

      tasks.push({
        title: `Architect: ${goal.title}`,
        description: `Architecture plan for: ${gapDescription}`,
        specialist: clamp('orion'),
      });

      if (isBackend || (!isFrontend && !isBackend)) {
        tasks.push({
          title: `Backend Implementation: ${goal.title}`,
          description: `Implement backend APIs for: ${gapDescription}`,
          specialist: clamp('rex'),
          alsoSpecialist: clamp('kai'),
        });
      }

      if (isFrontend) {
        tasks.push({
          title: `Frontend Implementation: ${goal.title}`,
          description: `Implement UI components for: ${gapDescription}`,
          specialist: clamp('nova'),
          alsoSpecialist: clamp('kai'),
        });
      }

      if (isSecurity) {
        tasks.push({
          title: `Security Audit: ${goal.title}`,
          description: `Audit auth flows for: ${gapDescription}`,
          specialist: clamp('felix'),
          alsoSpecialist: clamp('vex'),
        });
      }

      tasks.push({
        title: `Tests: ${goal.title}`,
        description: `Write test suite for: ${gapDescription}`,
        specialist: clamp('sage'),
      });
    } else if (resolvedTeam === 'research') {
      // Academic research decomposition
      tasks.push({
        title: `Literature review: ${goal.title}`,
        description: `Survey existing research on: ${gapDescription}`,
        specialist: clamp('lit'),
      });
      tasks.push({
        title: `Hypothesis and analysis: ${goal.title}`,
        description: `Formulate hypotheses and analyse findings for: ${gapDescription}`,
        specialist: clamp('hypo'),
        alsoSpecialist: clamp('cite'),
      });
      tasks.push({
        title: `Research report: ${goal.title}`,
        description: `Write a structured report summarising: ${gapDescription}`,
        specialist: clamp('data'),
      });
    } else {
      // General team: content, writing, learning, communication tasks
      tasks.push({
        title: `Research and summarise: ${goal.title}`,
        description: `Gather and condense key information on: ${gapDescription}`,
        specialist: clamp('quest'),
      });
      tasks.push({
        title: `Write content: ${goal.title}`,
        description: `Produce clear, accessible written content on: ${gapDescription}`,
        specialist: clamp('lyra'),
      });
      tasks.push({
        title: `Review and refine: ${goal.title}`,
        description: `Edit and improve the draft content on: ${gapDescription}`,
        specialist: clamp('gist'),
      });
    }

    // Apply taskSizeMultiplier (split tasks if junior — simplified for MVP)
    if (taskSizeMultiplier < 0.5) {
      const smallerTasks: DecomposedTask[] = [];
      for (const t of tasks) {
        smallerTasks.push({ ...t, title: `${t.title} (Part 1)` });
        smallerTasks.push({ ...t, title: `${t.title} (Part 2)` });
      }
      return smallerTasks;
    }

    return tasks;
  }
}
