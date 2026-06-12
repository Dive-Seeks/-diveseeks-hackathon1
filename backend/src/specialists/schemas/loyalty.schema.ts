import { z } from 'zod';

export const LoyaltyOutputSchema = z.object({
  programs: z
    .array(
      z.object({
        programName: z.string().min(3).max(60),
        programType: z.enum(['points', 'stamp', 'tier', 'referral']),
        pointsPerPound: z.number().positive().optional(),
        rewardThreshold: z.number().int().positive().optional(),
        rewardDescription: z.string().max(200),
        targetSegment: z.enum(['all', 'loyal', 'new', 'at_risk', 'vip']),
        estimatedRetentionLift: z.string().max(50),
      }),
    )
    .min(1)
    .max(3),
  summary: z.string().max(200),
});

export type LoyaltyOutput = z.infer<typeof LoyaltyOutputSchema>;

export const LoyaltyTemplateFallback: LoyaltyOutput = {
  programs: [
    {
      programName: 'Loyalty Points',
      programType: 'points',
      pointsPerPound: 1,
      rewardThreshold: 100,
      rewardDescription: '£5 off your next order',
      targetSegment: 'all',
      estimatedRetentionLift: '+15%',
    },
  ],
  summary: 'Template loyalty program generated.',
};
