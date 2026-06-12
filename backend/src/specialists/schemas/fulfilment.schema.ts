import { z } from 'zod';

export const FulfilmentOutputSchema = z.object({
  stockAlerts: z
    .array(
      z.object({
        sku: z.string(),
        productName: z.string().max(120),
        currentStock: z.number().int().min(0),
        reorderPoint: z.number().int().min(0),
        suggestedOrderQty: z.number().int().positive(),
        supplierName: z.string().max(100).optional(),
        leadTimeDays: z.number().int().positive().optional(),
        urgency: z.enum(['critical', 'high', 'medium', 'low']),
      }),
    )
    .min(0)
    .max(100),
  shippingRecommendations: z
    .array(
      z.object({
        carrier: z.string().max(80),
        service: z.string().max(80),
        estimatedCostGbp: z.number().min(0),
        estimatedDeliveryDays: z.number().int().positive(),
        recommendedFor: z.string().max(200),
      }),
    )
    .min(0)
    .max(5),
  returnRateInsights: z
    .array(
      z.object({
        reason: z.string().max(200),
        frequency: z.enum(['common', 'occasional', 'rare']),
        suggestedFix: z.string().max(300),
      }),
    )
    .min(0)
    .max(10),
  warehouseAlerts: z
    .array(
      z.object({
        type: z.enum(['overstock', 'dead_stock', 'mislabelled', 'expiring']),
        sku: z.string().optional(),
        description: z.string().max(300),
        action: z.string().max(200),
      }),
    )
    .min(0)
    .max(20),
  summary: z.string().max(300),
});

export type FulfilmentOutput = z.infer<typeof FulfilmentOutputSchema>;

export const FulfilmentTemplateFallback: FulfilmentOutput = {
  stockAlerts: [],
  shippingRecommendations: [],
  returnRateInsights: [],
  warehouseAlerts: [],
  summary: 'Fulfilment operations nominal. No critical alerts.',
};
