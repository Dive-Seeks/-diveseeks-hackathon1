import { z } from 'zod';

export const SeoOutputSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      field: z.string(),
      current: z.string(),
      suggestion: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
    }),
  ),
  keywords: z.array(z.string()).max(10),
  metaDescription: z.string().max(160).optional(),
});

export type SeoOutput = z.infer<typeof SeoOutputSchema>;

export const SeoTemplateFallback: SeoOutput = {
  score: 75,
  issues: [],
  keywords: ['restaurant', 'food'],
  metaDescription: 'Welcome to our restaurant.',
};
