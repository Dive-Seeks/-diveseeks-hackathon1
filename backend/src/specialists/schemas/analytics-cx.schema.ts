import { z } from 'zod';

export const AnalyticsCxOutputSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  funnelMetrics: z.object({
    sessions: z.number().int().min(0),
    productPageViews: z.number().int().min(0),
    addToCartCount: z.number().int().min(0),
    checkoutStarted: z.number().int().min(0),
    ordersCompleted: z.number().int().min(0),
    conversionRatePct: z.number().min(0).max(100),
    cartAbandonmentRatePct: z.number().min(0).max(100),
  }),
  revenueMetrics: z.object({
    totalRevenue: z.number().min(0),
    averageOrderValue: z.number().min(0),
    revenuePerSession: z.number().min(0),
    revenueChangePercent: z.number(),
  }),
  customerMetrics: z.object({
    newCustomers: z.number().int().min(0),
    returningCustomers: z.number().int().min(0),
    churnedCustomers: z.number().int().min(0),
    averageClv: z.number().min(0),
    repeatPurchaseRatePct: z.number().min(0).max(100),
  }),
  topProducts: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        sku: z.string(),
        name: z.string().max(120),
        unitsSold: z.number().int().min(0),
        revenue: z.number().min(0),
        returnRatePct: z.number().min(0).max(100).optional(),
      }),
    )
    .min(0)
    .max(10),
  insights: z.array(z.string().max(300)).min(1).max(8),
  recommendations: z.array(z.string().max(300)).min(1).max(5),
});

export type AnalyticsCxOutput = z.infer<typeof AnalyticsCxOutputSchema>;

export const AnalyticsCxTemplateFallback: AnalyticsCxOutput = {
  period: 'daily',
  funnelMetrics: {
    sessions: 0,
    productPageViews: 0,
    addToCartCount: 0,
    checkoutStarted: 0,
    ordersCompleted: 0,
    conversionRatePct: 0,
    cartAbandonmentRatePct: 0,
  },
  revenueMetrics: {
    totalRevenue: 0,
    averageOrderValue: 0,
    revenuePerSession: 0,
    revenueChangePercent: 0,
  },
  customerMetrics: {
    newCustomers: 0,
    returningCustomers: 0,
    churnedCustomers: 0,
    averageClv: 0,
    repeatPurchaseRatePct: 0,
  },
  topProducts: [],
  insights: ['Insufficient data to generate insights.'],
  recommendations: [
    'Ensure your storefront is connected and recording transactions.',
  ],
};
