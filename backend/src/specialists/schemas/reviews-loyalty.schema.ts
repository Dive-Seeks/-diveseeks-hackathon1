import { z } from 'zod';

export const ReviewsLoyaltyOutputSchema = z.object({
  reviewResponses: z
    .array(
      z.object({
        reviewId: z.string().optional(),
        rating: z.number().int().min(1).max(5),
        originalReview: z.string().max(500).optional(),
        draftResponse: z.string().min(20).max(400),
        sentiment: z.enum(['positive', 'neutral', 'negative']),
        escalate: z.boolean().default(false),
      }),
    )
    .min(0)
    .max(30),
  loyaltyProgram: z
    .object({
      programName: z.string().min(3).max(80),
      tierStructure: z
        .array(
          z.object({
            tierName: z.string().max(40),
            pointsRequired: z.number().int().min(0),
            benefits: z.array(z.string().max(200)).min(1).max(5),
          }),
        )
        .min(1)
        .max(5),
      pointsPerPound: z.number().positive(),
      welcomeBonus: z.number().int().min(0),
      expiryDays: z.number().int().positive(),
    })
    .optional(),
  referralCampaign: z
    .object({
      referrerReward: z.string().max(100),
      refereeReward: z.string().max(100),
      messageCopy: z.string().min(10).max(300),
      channel: z.enum(['email', 'sms', 'both', 'in_app']),
    })
    .optional(),
  summary: z.string().max(300),
});

export type ReviewsLoyaltyOutput = z.infer<typeof ReviewsLoyaltyOutputSchema>;

export const ReviewsLoyaltyTemplateFallback: ReviewsLoyaltyOutput = {
  reviewResponses: [],
  loyaltyProgram: {
    programName: 'Rewards Club',
    tierStructure: [
      {
        tierName: 'Bronze',
        pointsRequired: 0,
        benefits: ['1 point per £1 spent'],
      },
      {
        tierName: 'Silver',
        pointsRequired: 500,
        benefits: ['1.5 points per £1 spent', 'Free standard shipping'],
      },
      {
        tierName: 'Gold',
        pointsRequired: 2000,
        benefits: [
          '2 points per £1 spent',
          'Free express shipping',
          'Early access to sales',
        ],
      },
    ],
    pointsPerPound: 1,
    welcomeBonus: 100,
    expiryDays: 365,
  },
  summary: 'Template loyalty programme generated.',
};
