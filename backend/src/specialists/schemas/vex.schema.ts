import { z } from 'zod';

export const VexOutputSchema = z.object({
  validations: z.array(
    z.object({
      item: z.string(),
      passed: z.boolean(),
      score: z.number().min(0).max(100),
      note: z.string().max(200),
    }),
  ),
  overallScore: z.number().min(0).max(100),
  approved: z.boolean(),
  blockers: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});

export type VexOutput = z.infer<typeof VexOutputSchema>;

export const VexTemplateFallback: VexOutput = {
  validations: [
    {
      item: 'Keyword presence',
      passed: true,
      score: 75,
      note: 'Primary keyword found in headings',
    },
  ],
  overallScore: 75,
  approved: true,
  blockers: [],
  suggestions: ['Add alt text to all images'],
};
