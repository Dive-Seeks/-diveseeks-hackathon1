import { z } from 'zod';

export const OrionOutputSchema = z.object({
  keywordTargets: z
    .array(
      z.object({
        keyword: z.string(),
        volume: z.string(),
        difficulty: z.string(),
        intent: z.string(),
      }),
    )
    .max(10),
  contentGaps: z
    .array(
      z.object({
        topic: z.string(),
        reason: z.string(),
      }),
    )
    .max(5),
  priorityPages: z
    .array(
      z.object({
        pageType: z.string(),
        currentIssue: z.string(),
        suggestedFix: z.string(),
      }),
    )
    .max(8),
  roadmapSummary: z.string().max(300),
});

export type OrionOutput = z.infer<typeof OrionOutputSchema>;

export const OrionTemplateFallback: OrionOutput = {
  keywordTargets: [
    {
      keyword: 'restaurant near me',
      volume: '10000/mo',
      difficulty: 'medium',
      intent: 'local',
    },
  ],
  contentGaps: [
    { topic: 'Menu highlights', reason: 'No dedicated content page' },
  ],
  priorityPages: [
    {
      pageType: 'homepage',
      currentIssue: 'Missing meta description',
      suggestedFix: 'Write a 155-char meta description with primary keyword',
    },
  ],
  roadmapSummary:
    'Start with local keyword targeting and homepage meta optimisation.',
};
