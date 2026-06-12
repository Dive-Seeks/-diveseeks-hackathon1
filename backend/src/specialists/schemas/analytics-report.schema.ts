import { z } from 'zod';

export const AnalyticsReportOutputSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  salesMetrics: z.object({
    totalRevenue: z.number().min(0),
    totalTransactions: z.number().int().min(0),
    averageBasketValue: z.number().min(0),
    revenueChangePercent: z.number(),
    transactionChangePercent: z.number(),
  }),
  topProducts: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        sku: z.string(),
        productName: z.string().max(100),
        unitsSold: z.number().int().min(0),
        revenue: z.number().min(0),
      }),
    )
    .min(0)
    .max(20),
  conversionRate: z.number().min(0).max(100).optional(),
  insights: z.array(z.string().max(300)).min(1).max(10),
  recommendations: z.array(z.string().max(300)).min(1).max(5),
  alertFlags: z
    .array(
      z.object({
        flag: z.string().max(100),
        severity: z.enum(['info', 'warning', 'critical']),
        detail: z.string().max(300),
      }),
    )
    .min(0)
    .max(10),
});

export type AnalyticsReportOutput = z.infer<typeof AnalyticsReportOutputSchema>;

export const AnalyticsReportTemplateFallback: AnalyticsReportOutput = {
  period: 'daily',
  salesMetrics: {
    totalRevenue: 0,
    totalTransactions: 0,
    averageBasketValue: 0,
    revenueChangePercent: 0,
    transactionChangePercent: 0,
  },
  topProducts: [],
  insights: ['Insufficient data to generate insights.'],
  recommendations: ['Ensure POS transactions are being recorded correctly.'],
  alertFlags: [],
};
