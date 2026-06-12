import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { buildDiscoveryContext } from '@/lib/menu-context-builder';
import { getCuisineCategoryTemplates } from '@/lib/menu-context-builder';

// Cache discovery context (short string listing available cuisines)
let discoveryCtxCache: string | null = null;
async function getDiscoveryCtx() {
  if (discoveryCtxCache) return discoveryCtxCache;
  discoveryCtxCache = await buildDiscoveryContext();
  return discoveryCtxCache;
}

const categorySuggestionSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  categoryName: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  itemCountHint: z.number(),
  isRecommended: z.boolean(),
  businessType: z.string(),
});

const attributeSuggestionSchema = z.object({
  attributeKey: z.enum(['dietary_type', 'allergens', 'spice_level', 'meal_type', 'preparation_method']),
  attributeValue: z.string(),
  label: z.string(),
  icon: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  scope: z.enum(['global', 'item']),
});

/**
 * Fetches categories from backend DB, then OVERRIDES with cuisine-specific
 * templates from docs/Menus if cuisine is detected.
 */
async function fetchCategoryTemplates(
  businessType: string,
  keywords: string[],
  cuisines: string[],
  authToken: string,
): Promise<z.infer<typeof categorySuggestionSchema>[]> {
  // 1. Try cuisine-specific templates first (from our local reference data)
  if (cuisines.length > 0) {
    const cuisineCategories = getCuisineCategoryTemplates(cuisines, businessType);
    if (cuisineCategories.length > 0) {
      console.log('[WizardDiscovery] Using cuisine-specific categories for', cuisines.join(', '), ':', cuisineCategories.length);
      return cuisineCategories;
    }
  }

  // 2. Fall back to backend DB templates for non-mapped cuisines
  const backendUrl = process.env.API_PROXY_TARGET ?? 'http://localhost:7771';
  try {
    const res = await fetch(`${backendUrl}/api/ai-integration/wizard/category-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({ businessType, keywords, cuisines }),
    });
    if (!res.ok) return defaultCategories();
    const json = await res.json();
    // NestJS TransformInterceptor double-wraps: { data: { success, data: [...] }, statusCode }
    const inner = json.data ?? json;
    const categories = Array.isArray(inner) ? inner : Array.isArray(inner.data) ? inner.data : [];
    console.log('[WizardDiscovery] Backend DB returned', categories.length, 'categories');
    return categories.length > 0 ? categories : defaultCategories();
  } catch (err) {
    console.error('[WizardDiscovery] Network error:', err);
    return defaultCategories();
  }
}

function defaultCategories(): z.infer<typeof categorySuggestionSchema>[] {
  return [
    { id: 'cat-1', categorySlug: 'starters', categoryName: 'Starters', icon: '🥗', description: 'Small bites', itemCountHint: 5, isRecommended: true, businessType: 'RESTAURANT' },
    { id: 'cat-2', categorySlug: 'mains', categoryName: 'Main Courses', icon: '🍽️', description: 'Hearty meals', itemCountHint: 10, isRecommended: true, businessType: 'RESTAURANT' },
    { id: 'cat-3', categorySlug: 'drinks', categoryName: 'Drinks', icon: '🥤', description: 'Refreshments', itemCountHint: 8, isRecommended: false, businessType: 'RESTAURANT' },
  ];
}

// Tool input schemas
const analyzeDescriptionInput = z.object({
  description: z.string().describe('The raw description provided by the user'),
});

const askClarificationInput = z.object({
  question: z.string().describe('One focused business question, 1 sentence, friendly but professional tone.'),
  topic: z.string().describe('The topic being asked about: halal, allergens, spice, service_model, menu_structure, cuisine'),
});

const detectGlobalAttributesInput = z.object({
  attributes: z.array(attributeSuggestionSchema).describe('Detected global attributes for the whole menu'),
  summary: z.string().describe("Short 1-sentence confirmation of what was detected"),
});

const suggestCategoriesInput = z.object({
  businessType: z.string().describe('RESTAURANT, CAFE, BAR, or RETAIL').default('RESTAURANT'),
  keywords: z.array(z.string()).describe('All food/drink keywords extracted from conversation').default([]),
  cuisines: z.array(z.string()).describe('Detected cuisine styles').default([]),
  closingMessage: z.string().describe('Warm 1-sentence message before advancing').optional(),
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const authToken = req.headers.get('Authorization') ?? '';
  const modelMessages = await convertToModelMessages(messages);

  const discoveryCtx = await getDiscoveryCtx();

  // Check if suggestCategories was already called (prevent duplicates)
  const alreadySuggested = messages.some((m: any) =>
    m.parts?.some((p: any) =>
      p.type === 'tool-suggestCategories' && (p.state === 'output-available' || p.state === 'call')
    )
  );

  const result = streamText({
    model: google('gemini-flash-latest'),
    stopWhen: stepCountIs(6),
    system: `You are Abigail, an AI menu assistant for Dive POS.

BUSINESS MODE (once food/restaurant mentioned or if user just says hi): Professional but warm. Ask ONE question at a time to determine their business type.
Do NOT introduce yourself or say "Hi" again, as you have already greeted the user. Go straight to asking a question.

Business questions (pick 2-3 relevant ones, skip what they already told you):
1. "Is your full menu halal certified, or just certain items?"
2. "How do you handle allergens?"
3. "What's your spice range — mild to extra hot?"
4. "Is this dine-in, takeaway, delivery, or all three?"

TOOL RULES:
1. Call analyzeDescription IMMEDIATELY when user first describes their food business.
2. After 2-3 questions answered, call suggestCategories with extracted info.
3. NEVER write category names in text — only show via suggestCategories tool.
4. ${alreadySuggested ? 'suggestCategories was ALREADY called — do NOT call it again.' : 'You MUST call suggestCategories after enough info is gathered.'}

Keep replies SHORT (1-3 sentences). ONE question per message.
${discoveryCtx}`,
    messages: modelMessages,
    tools: {
      analyzeDescription: tool<z.infer<typeof analyzeDescriptionInput>, { businessType: string; keywords: string[]; cuisines: string[] }>({
        description: 'Analyze the business description to extract type, keywords, cuisines. Call immediately when user describes their food business.',
        inputSchema: analyzeDescriptionInput,
        execute: async (input) => {
          const desc = input.description.toLowerCase();
          const businessType =
            ['restaurant', 'dine in', 'bistro', 'grill', 'eatery'].some(k => desc.includes(k)) ? 'RESTAURANT' :
            ['cafe', 'coffee', 'bakery', 'brunch'].some(k => desc.includes(k)) ? 'CAFE' :
            ['bar', 'pub', 'cocktail', 'lounge'].some(k => desc.includes(k)) ? 'BAR' :
            ['retail', 'shop', 'grocery'].some(k => desc.includes(k)) ? 'RETAIL' : 'RESTAURANT';

          const foodKws = [
            'pizza', 'burger', 'burgers', 'chicken', 'wings', 'kebab', 'kebabs',
            'wrap', 'wraps', 'sandwich', 'coffee', 'cocktail', 'sushi', 'ramen',
            'curry', 'biryani', 'pasta', 'salad', 'steak', 'seafood', 'tacos',
            'halal', 'vegan', 'vegetarian', 'peri peri', 'bbq', 'fried chicken',
            'shawarma', 'doner', 'karahi', 'nihari', 'tikka', 'masala', 'naan',
            'samosa', 'chaat', 'noodles', 'dim sum', 'fries', 'milkshake',
          ];
          const keywords = foodKws.filter(k => desc.includes(k));

          const cuisineMap: Record<string, string[]> = {
            Italian: ['italian', 'pizza', 'pasta', 'risotto'],
            Indian: ['indian', 'curry', 'biryani', 'naan', 'tikka', 'masala', 'samosa'],
            Pakistani: ['pakistani', 'karahi', 'nihari', 'chapli kebab', 'seekh kebab'],
            Chinese: ['chinese', 'noodles', 'dim sum', 'wok', 'fried rice'],
            Japanese: ['japanese', 'sushi', 'ramen', 'tempura'],
            Turkish: ['turkish', 'kebab', 'doner', 'kofte'],
            American: ['american', 'burger', 'hot dog', 'bbq', 'smash burger'],
            Mexican: ['mexican', 'tacos', 'burritos', 'nachos'],
            'Middle Eastern': ['middle eastern', 'shawarma', 'falafel', 'hummus'],
            Thai: ['thai', 'pad thai', 'green curry'],
            British: ['british', 'fish and chips', 'pies'],
            Korean: ['korean', 'kimchi', 'bibimbap'],
            Bangladeshi: ['bangladeshi', 'ilish', 'bhuna'],
            Mediterranean: ['mediterranean', 'hummus', 'falafel', 'pita'],
            Vietnamese: ['vietnamese', 'pho', 'banh mi'],
          };
          const cuisines = Object.entries(cuisineMap)
            .filter(([, kws]) => kws.some(k => desc.includes(k)))
            .map(([c]) => c);

          return { businessType, keywords, cuisines };
        },
      }),

      askClarification: tool<z.infer<typeof askClarificationInput>, { question: string; topic: string }>({
        description: 'Ask user one business question.',
        inputSchema: askClarificationInput,
        execute: async (input) => ({ question: input.question, topic: input.topic }),
      }),

      detectGlobalAttributes: tool<z.infer<typeof detectGlobalAttributesInput>, { attributes: z.infer<typeof attributeSuggestionSchema>[]; summary: string }>({
        description: 'Record detected dietary/allergen/spice attributes when user confirms them.',
        inputSchema: detectGlobalAttributesInput,
        execute: async (input) => ({ attributes: input.attributes, summary: input.summary }),
      }),

      suggestCategories: tool<z.infer<typeof suggestCategoriesInput>, { categories: z.infer<typeof categorySuggestionSchema>[]; businessType: string; keywords: string[]; cuisines: string[] }>({
        description: 'Show menu categories for user to select. MUST call this to display categories.',
        inputSchema: suggestCategoriesInput,
        execute: async (input) => {
          const bt = input.businessType || 'RESTAURANT';
          const kw = input.keywords || [];
          const cu = input.cuisines || [];
          const cats = await fetchCategoryTemplates(bt, kw, cu, authToken);
          console.log('[WizardDiscovery] suggestCategories returning', cats.length, 'categories for', cu.join(', '));
          return { categories: cats, businessType: bt, keywords: kw, cuisines: cu };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
