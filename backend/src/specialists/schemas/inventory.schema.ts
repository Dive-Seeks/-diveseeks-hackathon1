import { z } from 'zod';

export const InventoryOutputSchema = z.object({
  alerts: z.array(
    z.object({
      item: z.string(),
      currentStock: z.number(),
      reorderLevel: z.number(),
      urgency: z.enum(['low', 'medium', 'high']),
    }),
  ),
  reorderSuggestions: z.array(z.string()),
});

export type InventoryOutput = z.infer<typeof InventoryOutputSchema>;

export const InventoryTemplateFallback: InventoryOutput = {
  alerts: [],
  reorderSuggestions: ['Check stock levels for main ingredients.'],
};
