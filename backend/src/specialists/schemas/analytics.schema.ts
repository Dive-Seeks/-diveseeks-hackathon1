import { z } from 'zod';

export const AnalyticsOutputSchema = z.object({
  insights: z.array(z.string()).min(1).max(10),
  topProducts: z.array(z.string()).max(5),
  recommendations: z.array(z.string()).min(1).max(5),
  healthScore: z.number().min(0).max(100),
});

export type AnalyticsOutput = z.infer<typeof AnalyticsOutputSchema>;

export const AnalyticsTemplateFallback: AnalyticsOutput = {
  insights: ['Sales are steady.'],
  topProducts: ['House Special'],
  recommendations: ['Consider a weekend promotion.'],
  healthScore: 85,
};
