import { z } from 'zod';

export const ImagesOutputSchema = z.object({
  images: z
    .array(
      z.object({
        imageType: z.enum(['hero', 'product', 'thumbnail', 'banner']),
        prompt: z
          .string()
          .min(20)
          .max(500)
          .describe('DALL-E generation prompt'),
        altText: z.string().min(5).max(125),
        dimensions: z.object({ width: z.number(), height: z.number() }),
        styleGuidance: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(10),
  summary: z.string().max(200),
});

export type ImagesOutput = z.infer<typeof ImagesOutputSchema>;

export const ImagesTemplateFallback: ImagesOutput = {
  images: [
    {
      imageType: 'hero',
      prompt:
        'Professional restaurant hero image with warm lighting and inviting atmosphere',
      altText: 'Restaurant hero image',
      dimensions: { width: 1200, height: 630 },
    },
  ],
  summary: 'Template image prompts generated.',
};
