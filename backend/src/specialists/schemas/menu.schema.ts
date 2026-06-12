import { z } from 'zod';

export const MenuItemSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(20).max(300),
  price: z.number().positive(),
  category: z.string(),
  allergens: z.array(z.string()).optional(),
  calories: z.number().optional(),
  isHalal: z.boolean().optional(),
  isVegan: z.boolean().optional(),
});

export const MenuOutputSchema = z.object({
  items: z.array(MenuItemSchema).min(1).max(50),
  summary: z.string().max(200),
});

export type MenuOutput = z.infer<typeof MenuOutputSchema>;

export const MenuTemplateFallback: MenuOutput = {
  items: [
    {
      name: 'House Special',
      description: 'Our signature dish, crafted with fresh ingredients.',
      price: 12.99,
      category: 'Mains',
    },
  ],
  summary: 'Template fallback menu generated.',
};
