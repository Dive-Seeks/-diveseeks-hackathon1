import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { buildModifiersContext } from '@/lib/menu-context-builder';

export async function POST(req: Request) {
  const { messages, businessType = 'RESTAURANT', keywords = [], dietaryType } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Build reference context from docs/Menus (modifier blueprints, halal rules)
  const modifiersCtx = await buildModifiersContext(businessType, keywords, dietaryType);

  const result = streamText({
    model: google('gemini-flash-latest'),
    stopWhen: stepCountIs(6),
    system: `You are Abigail, a friendly AI menu assistant for Dive POS. The user is setting up modifiers (extras, add-ons, sizes, spice levels) for their menu items.

Modifiers let customers customise their order. Common examples:
- Size: Small / Medium / Large (single_select, often required)
- Spice level: Mild / Medium / Hot / Extra Hot (single_select)
- Add-ons / Extras: Extra cheese, Extra sauce, Jalapeños (multi_select)
- Cooking preference: Well done / Medium / Rare (single_select)
- Sides: Fries / Salad / Rice (single_select or multi_select)

RULES:
- When user asks to add spice levels, sizes, extras, or any options — call addModifierGroup.
- type: "single_select" for options where only one can be chosen (size, spice), "multi_select" for add-ons where multiple can be chosen.
- priceModifier in pence/cents: 0 for no extra charge, 150 for +£1.50.
- isDefault: true for one option per single_select group (the default selection).
- required: true for sizes and cooking preference; false for optional add-ons.
- itemName can be "all" or a specific item name — the frontend will apply accordingly.
- Keep replies SHORT — 1 sentence confirmation after each action.
- Never list bullet points. Conversational only.
- Use the MODIFIER BLUEPRINTS below as templates when available — adapt them to the specific item.
${modifiersCtx}`,
    messages: modelMessages,
    tools: {
      addModifierGroup: tool({
        description: 'Add a modifier group (sizes, spice levels, extras, add-ons) to a menu item or all items.',
        inputSchema: z.object({
          itemName: z.string().describe('Name of the specific item, or "all" to apply globally'),
          groupName: z.string().describe('Modifier group name, e.g. "Spice Level", "Size", "Add-ons"'),
          type: z.enum(['single_select', 'multi_select']).describe('single_select for mutually exclusive options; multi_select for add-ons'),
          required: z.boolean().describe('Whether the customer must choose an option'),
          icon: z.string().describe('Emoji icon for this modifier group'),
          options: z.array(z.object({
            name: z.string().describe('Option label, e.g. "Mild", "Medium", "Extra Hot"'),
            priceModifier: z.number().int().describe('Extra cost in pence/cents (0 for no charge)'),
            isDefault: z.boolean().describe('True for the pre-selected default option'),
          })).min(2).describe('At least 2 options'),
        }),
        execute: async ({ itemName, groupName, type, required, icon, options }) => ({
          itemName,
          modifierGroup: {
            name: groupName,
            type,
            required,
            icon,
            options,
          },
        }),
      }),

      removeModifierGroup: tool({
        description: 'Remove a modifier group from an item.',
        inputSchema: z.object({
          itemName: z.string().describe('The item name the modifier belongs to'),
          groupName: z.string().describe('The modifier group name to remove'),
        }),
        execute: async ({ itemName, groupName }) => ({ itemName, groupName }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
