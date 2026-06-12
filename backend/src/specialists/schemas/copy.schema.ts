import { z } from 'zod';

export const CopyOutputSchema = z.object({
  copies: z
    .array(
      z.object({
        copyType: z.enum([
          'headline',
          'tagline',
          'about',
          'promo',
          'social_bio',
        ]),
        content: z.string().min(5).max(500),
        tone: z.enum(['friendly', 'professional', 'playful', 'luxury']),
        wordCount: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(10),
  summary: z.string().max(200),
});

export type CopyOutput = z.infer<typeof CopyOutputSchema>;

export const CopyTemplateFallback: CopyOutput = {
  copies: [
    {
      copyType: 'tagline',
      content: 'Fresh food, crafted with love.',
      tone: 'friendly',
      wordCount: 5,
    },
  ],
  summary: 'Template copy generated.',
};
