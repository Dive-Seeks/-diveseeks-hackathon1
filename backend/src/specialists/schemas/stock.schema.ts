import { z } from 'zod';

export const StockOutputSchema = z.object({
  alerts: z
    .array(
      z.object({
        itemId: z.string(),
        itemName: z.string(),
        currentStock: z.number().int().min(0),
        reorderThreshold: z.number().int().min(0),
        suggestedOrderQty: z.number().int().positive(),
        urgency: z.enum(['critical', 'high', 'medium', 'low']),
        supplierNote: z.string().max(200).optional(),
      }),
    )
    .min(0)
    .max(50),
  summary: z.string().max(200),
  totalAlertsCount: z.number().int().min(0),
});

export type StockOutput = z.infer<typeof StockOutputSchema>;

export const StockTemplateFallback: StockOutput = {
  alerts: [],
  summary: 'No critical stock alerts at this time.',
  totalAlertsCount: 0,
};
