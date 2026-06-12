import { z } from 'zod';

export const ProductCatalogueOutputSchema = z.object({
  products: z
    .array(
      z.object({
        sku: z.string().min(2).max(50),
        name: z.string().min(2).max(120),
        shortDescription: z.string().min(10).max(200),
        longDescription: z.string().min(20).max(1000),
        price: z.number().positive(),
        compareAtPrice: z.number().positive().optional(),
        category: z.string().min(2).max(80),
        tags: z.array(z.string().max(40)).max(10),
        variants: z
          .array(
            z.object({
              option: z.string().max(50),
              value: z.string().max(50),
              priceModifier: z.number().optional(),
              stockQty: z.number().int().min(0).optional(),
            }),
          )
          .max(20)
          .optional(),
        isDigital: z.boolean().default(false),
        weight: z.number().min(0).optional(),
        seoTitle: z.string().max(70).optional(),
        seoKeywords: z.array(z.string().max(50)).max(10).optional(),
      }),
    )
    .min(1)
    .max(50),
  categoryRecommendations: z
    .array(
      z.object({
        categoryName: z.string().max(80),
        reason: z.string().max(200),
      }),
    )
    .min(0)
    .max(10),
  summary: z.string().max(300),
});

export type ProductCatalogueOutput = z.infer<
  typeof ProductCatalogueOutputSchema
>;

export const ProductCatalogueTemplateFallback: ProductCatalogueOutput = {
  products: [
    {
      sku: 'PROD-001',
      name: 'Sample Product',
      shortDescription: 'A high-quality product crafted for our customers.',
      longDescription:
        'This product is designed with care and attention to detail, offering outstanding value and quality.',
      price: 29.99,
      category: 'General',
      tags: ['new', 'featured'],
      isDigital: false,
    },
  ],
  categoryRecommendations: [],
  summary: 'Template product catalogue generated.',
};
