import { z } from 'zod';

export const AdStrategyOutputSchema = z.object({
  budgetAllocation: z
    .array(
      z.object({
        platform: z.enum(['meta', 'google', 'tiktok', 'internal']),
        allocatedCents: z.number().int().min(0),
        rationale: z.string().max(200),
      }),
    )
    .min(1)
    .max(4),

  campaignRecommendations: z
    .array(
      z.object({
        campaignName: z.string().min(3).max(100),
        platform: z.enum(['meta', 'google', 'tiktok', 'internal']),
        targetSegment: z.enum([
          'all',
          'loyal',
          'new',
          'at_risk',
          'local',
          'lapsed',
        ]),
        objective: z.enum(['awareness', 'traffic', 'conversions', 'retention']),
        allocatedCents: z.number().int().positive(),
        adCreativeSuggestion: z.string().max(300),
        expectedCprCents: z.number().int().positive(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1)
    .max(5),

  killedCampaignsSummary: z
    .array(
      z.object({
        campaignName: z.string().max(100),
        reason: z.string().max(200),
        budgetRecovered: z.number().int().min(0),
      }),
    )
    .min(0)
    .max(10),

  winnersSummary: z
    .array(
      z.object({
        campaignName: z.string().max(100),
        performanceSummary: z.string().max(200),
        scaleRecommendation: z.string().max(200),
      }),
    )
    .min(0)
    .max(5),

  overallInsight: z.string().min(20).max(500),
  estimatedMonthlyRoiPct: z.number().min(0).max(10000).optional(),
});

export type AdStrategyOutput = z.infer<typeof AdStrategyOutputSchema>;

export const AdStrategyTemplateFallback: AdStrategyOutput = {
  budgetAllocation: [
    {
      platform: 'meta',
      allocatedCents: 0,
      rationale: 'No budget set yet — allocating placeholder.',
    },
  ],
  campaignRecommendations: [
    {
      campaignName: 'Welcome Campaign',
      platform: 'meta',
      targetSegment: 'new',
      objective: 'awareness',
      allocatedCents: 1000,
      adCreativeSuggestion:
        'Show your best-selling product with a short video.',
      expectedCprCents: 300,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
  ],
  killedCampaignsSummary: [],
  winnersSummary: [],
  overallInsight:
    'No active campaigns yet. Start with a small budget on Meta to build data.',
};
