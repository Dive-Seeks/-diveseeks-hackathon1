import { z } from 'zod';

export const MarketingOutputSchema = z.object({
  headline: z.string().min(5).max(100),
  tagline: z.string().min(5).max(150),
  socialPosts: z
    .array(
      z.object({
        platform: z.enum(['instagram', 'facebook', 'twitter']),
        content: z.string().max(280),
      }),
    )
    .min(1),
  emailSubject: z.string().max(80).optional(),
});

export type MarketingOutput = z.infer<typeof MarketingOutputSchema>;

export const MarketingTemplateFallback: MarketingOutput = {
  headline: 'Welcome to our store',
  tagline: 'We serve the best food',
  socialPosts: [
    {
      platform: 'instagram',
      content: 'Check out our new menu items! #food',
    },
  ],
};
