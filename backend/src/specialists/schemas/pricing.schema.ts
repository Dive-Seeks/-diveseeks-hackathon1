import { z } from 'zod';

export const PricingOutputSchema = z.object({
  adjustments: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string().min(2).max(100),
        currentPrice: z.number().positive(),
        suggestedPrice: z.number().positive(),
        changePercent: z.number().min(-50).max(100),
        rationale: z.string().max(300),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(0)
    .max(100),
  promotions: z
    .array(
      z.object({
        promoName: z.string().min(3).max(80),
        discountType: z.enum(['percent', 'fixed', 'bogo', 'bundle']),
        discountValue: z.number().positive(),
        applicableTo: z.string().max(200),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(0)
    .max(20),
  summary: z.string().max(300),
});

export type PricingOutput = z.infer<typeof PricingOutputSchema>;

export const PricingTemplateFallback: PricingOutput = {
  adjustments: [],
  promotions: [
    {
      promoName: 'Weekend Sale',
      discountType: 'percent',
      discountValue: 10,
      applicableTo: 'All products',
      startDate: '2026-05-03',
      endDate: '2026-05-04',
    },
  ],
  summary: 'No price adjustments required at this time.',
};
