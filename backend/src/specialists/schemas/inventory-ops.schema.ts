import { z } from 'zod';

export const InventoryOpsOutputSchema = z.object({
  shelfAlerts: z
    .array(
      z.object({
        sku: z.string(),
        productName: z.string().max(100),
        location: z.string().max(100),
        currentStock: z.number().int().min(0),
        minShelfStock: z.number().int().min(0),
        action: z.enum(['restock', 'remove', 'relocate', 'mark_down']),
        urgency: z.enum(['critical', 'high', 'medium', 'low']),
      }),
    )
    .min(0)
    .max(200),
  predictiveReorders: z
    .array(
      z.object({
        sku: z.string(),
        productName: z.string().max(100),
        currentStock: z.number().int().min(0),
        predictedDemandDays: z.number().int().positive(),
        suggestedOrderQty: z.number().int().positive(),
        supplierName: z.string().max(100).optional(),
        estimatedLeadTimeDays: z.number().int().positive(),
      }),
    )
    .min(0)
    .max(100),
  checkoutAnomalies: z
    .array(
      z.object({
        type: z.enum([
          'shrinkage',
          'miscount',
          'pricing_error',
          'duplicate_scan',
        ]),
        description: z.string().max(300),
        affectedSku: z.string().optional(),
        estimatedLoss: z.number().min(0).optional(),
      }),
    )
    .min(0)
    .max(20),
  summary: z.string().max(300),
});

export type InventoryOpsOutput = z.infer<typeof InventoryOpsOutputSchema>;

export const InventoryOpsTemplateFallback: InventoryOpsOutput = {
  shelfAlerts: [],
  predictiveReorders: [],
  checkoutAnomalies: [],
  summary: 'Inventory operations nominal. No critical alerts.',
};
