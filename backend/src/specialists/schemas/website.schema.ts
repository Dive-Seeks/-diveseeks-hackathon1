import { z } from 'zod';

export const WebsiteOutputSchema = z.object({
  pages: z
    .array(
      z.object({
        pageType: z.enum(['homepage', 'about', 'menu', 'contact']),
        headline: z.string().min(5).max(80),
        subheadline: z.string().max(150).optional(),
        bodyContent: z.string().min(50).max(2000),
        seoTitle: z.string().min(10).max(60),
        seoDescription: z.string().min(50).max(160),
        ctaText: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(4),
  summary: z.string().max(200),
});

export type WebsiteOutput = z.infer<typeof WebsiteOutputSchema>;

export const WebsiteTemplateFallback: WebsiteOutput = {
  pages: [
    {
      pageType: 'homepage',
      headline: 'Welcome to Our Restaurant',
      bodyContent: 'We serve fresh, delicious food crafted with care.',
      seoTitle: 'Our Restaurant — Fresh Food',
      seoDescription:
        'Discover our menu of fresh, handcrafted dishes made with local ingredients.',
    },
  ],
  summary: 'Template website content generated.',
};
