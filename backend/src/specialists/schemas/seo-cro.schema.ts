import { z } from 'zod';

export const SeoCroOutputSchema = z.object({
  pageOptimisations: z
    .array(
      z.object({
        pageType: z.enum([
          'product',
          'category',
          'homepage',
          'landing',
          'blog',
        ]),
        pageIdentifier: z.string().max(100),
        currentTitle: z.string().max(70).optional(),
        suggestedTitle: z.string().min(10).max(70),
        metaDescription: z.string().min(50).max(160),
        h1Suggestion: z.string().max(100),
        bodyChanges: z
          .array(
            z.object({
              location: z.string().max(100),
              original: z.string().max(500).optional(),
              revised: z.string().max(500),
              reason: z.string().max(200),
            }),
          )
          .max(5),
        ctaSuggestion: z.string().max(50).optional(),
      }),
    )
    .min(1)
    .max(20),
  keywordOpportunities: z
    .array(
      z.object({
        keyword: z.string().max(80),
        monthlySearchVolume: z.string().max(20),
        difficulty: z.enum(['low', 'medium', 'high']),
        targetPage: z.string().max(100),
      }),
    )
    .min(0)
    .max(10),
  conversionTips: z.array(z.string().max(300)).min(1).max(5),
  summary: z.string().max(300),
});

export type SeoCroOutput = z.infer<typeof SeoCroOutputSchema>;

export const SeoCroTemplateFallback: SeoCroOutput = {
  pageOptimisations: [
    {
      pageType: 'homepage',
      pageIdentifier: 'home',
      suggestedTitle: 'Shop Online — Quality Products Delivered Fast',
      metaDescription:
        'Discover our range of quality products. Fast delivery, easy returns, and great prices. Shop now.',
      h1Suggestion: 'Shop Our Best Sellers',
      bodyChanges: [],
    },
  ],
  keywordOpportunities: [],
  conversionTips: [
    'Add social proof (reviews count) near the add-to-cart button.',
  ],
  summary: 'Template SEO/CRO optimisations generated.',
};
