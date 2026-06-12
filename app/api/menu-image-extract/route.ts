import { generateObject, generateText } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const menuExtractionSchema = z.object({
  restaurantName: z.string().default("").describe("Restaurant/Business name if visible on the menu"),
  categories: z.array(z.object({
    name: z.string().describe("Category name from the menu"),
    description: z.string().default("").describe("Brief, appetizing category description (1-2 sentences)"),
    seoTags: z.string().default("").describe("5-8 relevant SEO keywords for this category, comma-separated"),
    items: z.array(z.object({
      name: z.string().describe("Item name exactly as shown"),
      description: z.string().default("").describe("Appetizing item description highlighting key ingredients/features"),
      seoTags: z.string().default("").describe("5-8 SEO keywords for this item, comma-separated"),
      basePrice: z.number().describe("Price in cents (e.g., 1250 for $12.50, 500 for $5.00)"),
      modifiers: z.array(z.string()).default([]).describe("Size options, add-ons, toppings etc."),
    }))
  })),
  currency: z.string().default("$").describe("Detected currency symbol like $, £, €"),
  businessType: z.enum(['food', 'retail', 'grocery', 'cafe']).describe("Type of business based on menu"),
  detectedAttributes: z.array(z.object({
    attributeKey: z.enum(['dietary_type', 'allergens', 'spice_level', 'meal_type', 'preparation_method']),
    attributeValue: z.string(),
    label: z.string(),
    icon: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    scope: z.enum(['global', 'item']),
  })).default([]).describe("Global dietary/allergen/spice attributes detected from the menu"),
  attributeAiMessage: z.string().default("").describe("Friendly one-sentence message about detected attributes"),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return Response.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const prompt = `You are Abigail, an expert menu data extraction and SEO specialist for restaurant POS systems. Extract a complete, SEO-optimized menu from this image.

      CRITICAL EXTRACTION REQUIREMENTS:

      1. RESTAURANT NAME: Extract the business name if visible on the menu (logo, header, footer)

      2. CATEGORIES: Group items logically (e.g., Starters, Mains, Desserts, Beverages)
         - Name: Exact category name from menu
         - Description: Write 1-2 compelling sentences describing this category's offerings
         - SEO Tags: Generate 5-8 relevant keywords (e.g., "fresh, authentic, handmade, local, signature")

      3. ITEMS: Extract EVERY menu item with precision
         - Name: Exact item name as shown
         - Description: Create appetizing 1-2 sentence descriptions highlighting key ingredients, cooking method, or unique features
         - SEO Tags: Generate 5-8 specific keywords (e.g., "halal, vegan, gluten-free, spicy, grilled, organic, bestseller")
         - Base Price: Convert to CENTS (£12.50 = 1250, $5.00 = 500)
         - Modifiers: Extract customization options (sizes, add-ons, toppings, sauces, sides)

      4. SEO KEYWORD GUIDELINES:
         - Use descriptive adjectives: fresh, artisan, premium, authentic, homemade
         - Include dietary tags: halal, vegan, vegetarian, gluten-free, dairy-free
         - Add style tags: traditional, gourmet, signature, specialty, fusion
         - Location relevance: local, imported, regional (if visible)
         - Preparation methods: grilled, fried, baked, steamed, wood-fired
         - DO NOT repeat the item/category name in tags
         - Use lowercase, comma-separated format

      5. DESCRIPTION WRITING RULES:
         - Make it appetizing and enticing
         - Highlight what makes it special
         - Mention key ingredients if visible
         - Keep it 1-2 sentences, concise
         - Use active, sensory language

      Return ONLY valid JSON. If data is missing, use empty strings or arrays. Do not hallucinate information not visible in the image.

      6. GLOBAL ATTRIBUTE DETECTION:
         Detect attributes that apply to the WHOLE menu and return them in detectedAttributes:
         - dietary_type: Look for Halal/Vegan/Vegetarian/Kosher/Gluten-Free labels, certification logos, or menu section names
           Values: halal, non_halal, vegan, vegetarian, pescatarian, kosher, gluten_free, dairy_free, keto, organic
         - spice_level: Look for spice ratings, chilli icons, heat indicators
           Values: no_spice, mild, medium, hot, extra_hot
         - allergens: Look for allergen declarations at the bottom of menus
           Values: contains_gluten, contains_dairy, contains_eggs, contains_nuts, contains_shellfish, contains_fish
         - Set confidence: "high" if explicitly labelled/certified, "medium" if strongly implied, "low" if uncertain
         - Set scope: "global" if it applies to the whole menu
         - attributeAiMessage: One friendly sentence, e.g. "I detected this menu is fully Halal-certified."
         - If no attributes detected, return empty detectedAttributes array and empty attributeAiMessage`;

    // Configuration for multiple API keys to rotate through during high demand/quota limits
    const apiKeys = [
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      process.env.GOOGLE_AI_API_KEY_2, // Secondary key for rotation
      process.env.GOOGLE_AI_API_KEY_FALLBACK
    ].filter(Boolean);

    let lastError: any = null;
    let successfulKeyIndex = -1;
    let extractionResult: any = null;

    let usage: any = null;

    // We stick with gemini-flash-latest as it's the only one currently available for these keys,
    // but we rotate keys to mitigate temporary "High Demand" or individual key rate limits.
    const modelId = 'gemini-flash-latest';

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        console.log(`[Extraction] Attempting with ${modelId} using key ${i + 1}...`);
        
        const googleFactory = createGoogleGenerativeAI({ apiKey });
        const result = await generateObject({
          model: googleFactory(modelId),
          schema: menuExtractionSchema,
          maxRetries: 3, // Per key
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image', image: base64Image }
              ]
            }
          ],
        });
        
        extractionResult = result.object;
        usage = result.usage;
        successfulKeyIndex = i;
        break; // Success!
      } catch (err: any) {
        lastError = err;
        const isRetryableStatus = err?.statusCode === 503 || err?.statusCode === 429 || 
                                 err?.message?.toLowerCase().includes('high demand') || 
                                 err?.message?.toLowerCase().includes('quota');
        
        if (isRetryableStatus && i < apiKeys.length - 1) {
          console.warn(`[Extraction] Key ${i + 1} overloaded or limited. Rotating to key ${i + 2}...`);
          // Optional: slight delay before trying next key to allow transient spike to pass
          await new Promise(r => setTimeout(r, 1000));
          continue; 
        }
        
        // If it's a critical non-retryable error OR we ran out of keys
        console.error(`[Extraction] Error with key ${i + 1}:`, err.message);
        break;
      }
    }

    // If all Google keys failed, try OpenRouter as fallback
    if (!extractionResult && process.env.OPENROUTER_API_KEY) {
      console.log('[Extraction] All Google keys exhausted. Trying OpenRouter fallback...');
      try {
        const openrouter = createOpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY
        });

        // Use text generation with JSON response for OpenRouter to avoid schema strictness
        const textPrompt = `${prompt}

You MUST respond with ONLY a valid JSON object matching this exact structure:
{
  "restaurantName": "string (required, empty string if not visible)",
  "categories": [{
    "name": "string (required)",
    "description": "string (required, 1-2 sentences)",
    "seoTags": "string (required, 5-8 comma-separated keywords)",
    "items": [{
      "name": "string (required)",
      "description": "string (required, 1-2 sentences)",
      "seoTags": "string (required, 5-8 comma-separated keywords)",
      "basePrice": number (required, in cents),
      "modifiers": ["string array (required, use empty array if none)"]
    }]
  }],
  "currency": "string (required, like $, £, €)",
  "businessType": "food|retail|grocery|cafe (required)"
}`;

        const result = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          maxOutputTokens: 4000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: textPrompt },
                { type: 'image', image: base64Image }
              ]
            }
          ],
        });

        // Parse JSON response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('OpenRouter did not return valid JSON');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        extractionResult = menuExtractionSchema.parse(parsed);
        usage = result.usage;
        successfulKeyIndex = -2; // Indicator for OpenRouter
        console.log('[Extraction] OpenRouter fallback successful!');
      } catch (openrouterError: any) {
        console.error('[Extraction] OpenRouter fallback also failed:', openrouterError.message);
        lastError = openrouterError;
      }
    }

    if (!extractionResult) {
      console.error('[Extraction] All API providers failed or were overloaded.');
      throw lastError || new Error('All available AI capacity is currently exhausted.');
    }

    const provider = successfulKeyIndex === -2 ? 'OpenRouter (GPT-4o-mini)' : `Google Gemini (Key ${successfulKeyIndex + 1})`;
    const modelName = successfulKeyIndex === -2 ? 'openai/gpt-4o-mini' : modelId;

    console.log(`[Extraction] Success using ${provider}:`, {
      categories: extractionResult.categories.length,
      totalItems: extractionResult.categories.reduce((sum: number, cat: any) => sum + cat.items.length, 0)
    });

    return Response.json({
      success: true,
      data: extractionResult,
      provider: provider,
      model: modelName,
      usage: usage
    });

  } catch (error: any) {
    console.error('[Extraction] Global failure:', error.message);
    
    // Provide a cleaner error message if it's still failing after rotation
    let userMessage = 'Failed to extract menu. AI capacity is currently limited.';
    if (error?.statusCode === 503 || error?.message?.includes('high demand')) {
      userMessage = 'All AI models are currently under extremely high demand. This is often temporary—please wait 30 seconds and try again, or use text description.';
    } else if (error?.message?.includes('quota') || error?.message?.includes('Quota exceeded')) {
      userMessage = '⏰ Daily AI quota exhausted. Your quota will reset tomorrow. Meanwhile, please use the "Describe Your Business" option instead of image upload, or try again tomorrow.';
    } else if (error?.message?.includes('credits')) {
      userMessage = '💳 OpenRouter backup requires credits. Please use the "Describe Your Business" option to continue creating your menu without AI vision.';
    } else if (error?.message) {
      userMessage = error.message;
    }

    return Response.json({
      success: false,
      error: userMessage
    }, { status: 500 });
  }
}
