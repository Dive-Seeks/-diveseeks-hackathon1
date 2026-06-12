import { z } from 'zod';

export const DesignOutputSchema = z.object({
  assets: z
    .array(
      z.object({
        assetType: z.enum([
          'logo',
          'colour_palette',
          'icon_set',
          'menu_layout',
        ]),
        description: z.string().min(10).max(300),
        primaryColour: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        secondaryColour: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        notes: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(5),
  summary: z.string().max(200),
});

export type DesignOutput = z.infer<typeof DesignOutputSchema>;

export const DesignTemplateFallback: DesignOutput = {
  assets: [
    {
      assetType: 'colour_palette',
      description: 'Warm earth tones for a welcoming restaurant brand',
      primaryColour: '#8B4513',
      secondaryColour: '#F5DEB3',
    },
  ],
  summary: 'Template design assets generated.',
};
