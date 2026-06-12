import { z } from 'zod';

export const EmailSmsOutputSchema = z.object({
  campaigns: z
    .array(
      z.object({
        name: z.string().min(3).max(100),
        channel: z.enum(['email', 'sms', 'both']),
        triggerType: z.enum([
          'scheduled',
          'abandoned_cart',
          'post_purchase',
          'win_back',
          'welcome',
          'birthday',
        ]),
        subject: z.string().min(5).max(80).optional(),
        previewText: z.string().max(150).optional(),
        body: z.string().min(20).max(2000),
        smsText: z.string().max(160).optional(),
        targetSegment: z.enum([
          'all',
          'new',
          'loyal',
          'at_risk',
          'lapsed',
          'vip',
        ]),
        sendDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        estimatedOpenRatePct: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(10),
  automationFlows: z
    .array(
      z.object({
        flowName: z.string().max(80),
        trigger: z.string().max(200),
        steps: z.array(z.string().max(200)).min(1).max(5),
      }),
    )
    .min(0)
    .max(5),
  summary: z.string().max(300),
});

export type EmailSmsOutput = z.infer<typeof EmailSmsOutputSchema>;

export const EmailSmsTemplateFallback: EmailSmsOutput = {
  campaigns: [
    {
      name: 'Welcome Series',
      channel: 'email',
      triggerType: 'welcome',
      subject: "Welcome! Here's 10% off your first order",
      previewText: 'A little thank you for joining us.',
      body: "Hi there,\n\nWelcome to our store! As a thank you, here's 10% off your first order. Use code WELCOME10 at checkout.\n\nShop now and discover our latest collection.\n\nThanks,\nThe Team",
      targetSegment: 'new',
    },
  ],
  automationFlows: [],
  summary: 'Template email welcome campaign generated.',
};
