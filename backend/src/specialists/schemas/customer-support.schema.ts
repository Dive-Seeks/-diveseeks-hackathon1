import { z } from 'zod';

export const CustomerSupportOutputSchema = z.object({
  responses: z
    .array(
      z.object({
        ticketId: z.string().optional(),
        channel: z.enum(['chat', 'sms', 'email', 'in_store']),
        query: z.string().max(500),
        response: z.string().min(10).max(1000),
        sentiment: z.enum(['positive', 'neutral', 'negative']),
        resolutionType: z.enum([
          'resolved',
          'escalated',
          'pending',
          'informational',
        ]),
      }),
    )
    .min(0)
    .max(50),
  productRecommendations: z
    .array(
      z.object({
        trigger: z.string().max(200),
        recommendedProduct: z.string().max(100),
        reason: z.string().max(300),
      }),
    )
    .min(0)
    .max(10),
  summary: z.string().max(300),
  escalationCount: z.number().int().min(0),
});

export type CustomerSupportOutput = z.infer<typeof CustomerSupportOutputSchema>;

export const CustomerSupportTemplateFallback: CustomerSupportOutput = {
  responses: [],
  productRecommendations: [],
  summary: 'No customer support tickets pending.',
  escalationCount: 0,
};
