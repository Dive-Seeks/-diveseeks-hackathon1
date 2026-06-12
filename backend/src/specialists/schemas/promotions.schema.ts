import { z } from 'zod';

export const PromotionsOutputSchema = z.object({
  campaigns: z
    .array(
      z.object({
        campaignName: z.string().min(3).max(100),
        campaignType: z.enum([
          'flash_sale',
          'seasonal',
          'clearance',
          'loyalty_boost',
          'bundle',
          'referral',
        ]),
        targetSegment: z.enum([
          'all',
          'loyal',
          'new',
          'at_risk',
          'vip',
          'lapsed',
        ]),
        channels: z
          .array(z.enum(['email', 'sms', 'push', 'in_store', 'social']))
          .min(1),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        discountType: z.enum([
          'percent',
          'fixed',
          'free_item',
          'points_multiplier',
        ]),
        discountValue: z.number().positive(),
        estimatedReach: z.number().int().min(0).optional(),
        messageCopy: z.string().min(10).max(500),
      }),
    )
    .min(1)
    .max(10),
  summary: z.string().max(300),
  expectedRevenueImpact: z.string().max(100).optional(),
});

export type PromotionsOutput = z.infer<typeof PromotionsOutputSchema>;

export const PromotionsTemplateFallback: PromotionsOutput = {
  campaigns: [
    {
      campaignName: 'Welcome Campaign',
      campaignType: 'seasonal',
      targetSegment: 'all',
      channels: ['email'],
      startDate: '2026-05-03',
      endDate: '2026-05-31',
      discountType: 'percent',
      discountValue: 10,
      messageCopy: 'Welcome! Enjoy 10% off your next purchase.',
    },
  ],
  summary: 'Template promotion campaign generated.',
};
