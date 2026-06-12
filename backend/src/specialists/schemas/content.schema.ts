import { z } from 'zod';

export const ContentOutputSchema = z.object({
  productDescriptions: z
    .array(
      z.object({
        productId: z.string().optional(),
        productName: z.string().min(2).max(100),
        shortDescription: z.string().min(10).max(160),
        longDescription: z.string().min(20).max(800),
        seoTitle: z.string().max(60),
        seoKeywords: z.array(z.string().max(50)).max(10),
      }),
    )
    .min(0)
    .max(50),
  socialPosts: z
    .array(
      z.object({
        platform: z.enum([
          'instagram',
          'facebook',
          'twitter',
          'tiktok',
          'linkedin',
        ]),
        content: z.string().min(10).max(500),
        hashtags: z.array(z.string()).max(20),
        scheduledDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .min(0)
    .max(20),
  newsletter: z
    .object({
      subject: z.string().min(5).max(80),
      previewText: z.string().max(150),
      body: z.string().min(50).max(3000),
    })
    .optional(),
  summary: z.string().max(300),
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

export const ContentTemplateFallback: ContentOutput = {
  productDescriptions: [],
  socialPosts: [
    {
      platform: 'instagram',
      content:
        'Discover our latest products — quality you can trust. Shop now!',
      hashtags: ['#retail', '#newproduct', '#shopping'],
    },
  ],
  summary: 'Template content generated.',
};
