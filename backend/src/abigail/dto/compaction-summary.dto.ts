import { z } from 'zod';

export const CompactionSummarySchema = z.object({
  activeTask: z
    .string()
    .describe('THE most important field — what is the agent doing RIGHT NOW'),
  goal: z.string(),
  constraintsAndPreferences: z.string(),
  completedActions: z.array(z.string()).describe('e.g. "ran X → result Y"'),
  activeState: z
    .string()
    .describe('files open, last tool result, current values'),
  inProgress: z.string(),
  blocked: z.string().describe('EXACT error messages if any'),
  keyDecisions: z.string(),
  resolvedQuestions: z.string(),
  pendingUserAsks: z.string(),
  relevantFiles: z.array(z.string()),
  remainingWork: z.string(),
  criticalContext: z.string(),
});

export type CompactionSummary = z.infer<typeof CompactionSummarySchema>;
