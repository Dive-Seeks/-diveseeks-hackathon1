import { z } from 'zod';

export const MerchandisingOutputSchema = z.object({
  reports: z
    .array(
      z.object({
        reportType: z.enum([
          'category_performance',
          'supplier_scorecard',
          'planogram_compliance',
          'margin_analysis',
        ]),
        summary: z.string().min(20).max(500),
        keyFindings: z.array(z.string().max(300)).min(1).max(5),
        actionItems: z.array(z.string().max(300)).min(0).max(5),
      }),
    )
    .min(0)
    .max(10),
  supplierUpdates: z
    .array(
      z.object({
        supplierName: z.string().max(100),
        category: z.string().max(100),
        status: z.enum(['active', 'review', 'discontinue', 'onboard']),
        note: z.string().max(300),
      }),
    )
    .min(0)
    .max(20),
  planogramChanges: z
    .array(
      z.object({
        location: z.string().max(100),
        currentArrangement: z.string().max(200),
        suggestedArrangement: z.string().max(200),
        expectedLift: z.string().max(50).optional(),
      }),
    )
    .min(0)
    .max(10),
  summary: z.string().max(300),
});

export type MerchandisingOutput = z.infer<typeof MerchandisingOutputSchema>;

export const MerchandisingTemplateFallback: MerchandisingOutput = {
  reports: [],
  supplierUpdates: [],
  planogramChanges: [],
  summary: 'No merchandising changes required at this time.',
};
