/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { SiteMenu } from './entities/site-menu.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { Product } from '../products/entities/product.entity';
import { Site } from '../sites/entities/site.entity';
import { Pricing } from '../pricing/entities/pricing.entity';
import { Modifier } from '../modifiers/entities/modifier.entity';
import { ModifierOption } from '../modifiers/entities/modifier-option.entity';
import { MenuItemModifier } from '../modifiers/entities/menu-item-modifier.entity';
import { ModifierOptionPricing } from '../modifiers/entities/modifier-option-pricing.entity';
import { ModifierTemplate } from './entities/modifier-template.entity';
import { Store } from '../setup-business/entities/store.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateObject, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const CUISINE_MAP: Record<string, string[]> = {
  pizza: ['pizza', 'italian', 'fast-food', 'takeaway'],
  burger: ['burger', 'sandwich', 'fast-food', 'american'],
  chicken: ['chicken', 'fried', 'fast-food', 'wings'],
  coffee: ['coffee', 'cafe', 'bakery', 'breakfast'],
  retail: ['grocery', 'essentials', 'retail', 'featured'],
};

const BASE_CATEGORIES = [
  'beverages',
  'drinks',
  'sides',
  'starters',
  'desserts',
  'sweets',
];

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(SiteMenu)
    private readonly siteMenuRepository: Repository<SiteMenu>,
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    @InjectRepository(Pricing)
    private readonly pricingRepository: Repository<Pricing>,
    @InjectRepository(ModifierTemplate)
    private readonly modifierTemplateRepository: Repository<ModifierTemplate>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    @InjectRepository(ModifierOption)
    private readonly modifierOptionRepository: Repository<ModifierOption>,
    @InjectRepository(MenuItemModifier)
    private readonly menuItemModifierRepository: Repository<MenuItemModifier>,
    @InjectRepository(ModifierOptionPricing)
    private readonly modifierOptionPricingRepository: Repository<ModifierOptionPricing>,
  ) {}

  private scrubBranding(text: string): string {
    if (!text) return text;
    let scrubbed = text;

    // 1. Specific Product Swaps (High Priority)
    scrubbed = scrubbed.replace(/papadias/gi, 'Flatbread Handhelds');
    scrubbed = scrubbed.replace(/papa bowls/gi, 'Premium Bowls');

    // 2. Generic Brand Scrubbing
    const brands = [
      /domino['s]?/gi,
      /papa john['s]?/gi,
      /papa\s/gi,
      /pizza hut/gi,
      /subway/gi,
      /kfc/gi,
      /mcdonald['s]?/gi,
      /starbucks/gi,
      /pepsi/gi,
      /coca-cola/gi,
      /coke/gi,
    ];

    brands.forEach((brand) => {
      scrubbed = scrubbed.replace(brand, 'Premium');
    });

    return scrubbed;
  }

  async getActiveMenuForSite(siteId: string) {
    const siteMenu = await this.siteMenuRepository.findOne({
      where: { siteId, isActive: true },
      relations: [
        'menu',
        'menu.categories',
        'menu.categories.children',
        'menu.items',
        'menu.items.product',
        'menu.items.modifiers',
        'menu.items.modifiers.modifier',
        'menu.items.modifiers.modifier.options',
      ],
    });

    if (!siteMenu) {
      throw new NotFoundException(`No active menu found for site ${siteId}`);
    }

    return {
      success: true,
      data: siteMenu.menu,
    };
  }

  private async loadTemplates() {
    try {
      const filePath = path.join(
        process.cwd(),
        '..',
        'docs',
        'Menus',
        'menus.json',
      );
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load menu templates:', error);
      return { restaurants: [] };
    }
  }

  async matchCategories(body: any) {
    const {
      cuisines = [],
      // businessType kept for future category filtering
      businessType: _businessType = 'food',
      suggestedCategories = [],
    } = body;
    console.log('--- WIZARD DEBUG: INTENT ---', body);

    const templates = await this.loadTemplates();

    // Fix #6 — Keyword Expansion

    const expandedTerms = (cuisines as string[]).flatMap(
      (c: string) => CUISINE_MAP[c.toLowerCase()] || [c.toLowerCase()],
    );
    const searchTerms = [
      ...new Set([...expandedTerms, ...(suggestedCategories as string[])]),
    ].map((t: string) => t.toLowerCase());

    // Flatten and enrich with unique ID

    const allCategories: any[] = (templates.restaurants as any[]).flatMap(
      (r: any) =>
        (r.categories as any[]).map((cat: any) => ({
          ...cat,
          id: `${r.id as string}-${cat.id as string}`,
          displayName: this.scrubBranding(cat.name as string),
          description: this.scrubBranding(cat.description as string),
          matchCount: 0,
        })),
    );

    // Fix #1 — Rank and return MANY
    const scoredCategories = allCategories
      .map((cat: any) => {
        let score = 0;
        const catContent =
          `${cat.name as string} ${(cat.description as string) || ''}`.toLowerCase();
        searchTerms.forEach((term) => {
          if (catContent.includes(term)) score += 1;
        });
        return { ...cat, matchCount: score };
      })
      .filter(
        (cat: any) =>
          searchTerms.length === 0 || (cat.matchCount as number) > 0,
      );

    // Fix #2 — ALWAYS include baseline categories
    const baseCategories = allCategories
      .filter((cat: any) =>
        BASE_CATEGORIES.some((base) =>
          (cat.name as string).toLowerCase().includes(base),
        ),
      )
      .map((cat: any) => ({ ...cat, matchCount: -1 }));

    // Combine and sort by matchCount
    const finalSelection = [...scoredCategories, ...baseCategories].sort(
      (a: any, b: any) => (b.matchCount as number) - (a.matchCount as number),
    );

    // Deduplicate by Name to keep it clean and white-labeled
    const unique = Array.from(
      new Map(
        finalSelection.map((item: any) => [item.displayName as string, item]),
      ).values(),
    );

    console.log('--- WIZARD DEBUG: MATCHED CATEGORIES ---', unique.length);

    return unique.slice(0, 15);
  }

  async getItemsByCategories(
    categoryIds: string[],
    _businessType: string = 'food',
  ) {
    const templates = await this.loadTemplates();

    // Fix #3 — Items should NOT be limited
    const allItems = (templates.restaurants as any[]).flatMap((r: any) =>
      (r.categories as any[]).flatMap((cat: any) =>
        (cat.items || []).map((item) => {
          // Resolve basePrice: use top-level or first option's basePrice
          const resolvedPrice =
            item.basePrice || (item.options && item.options[0]?.basePrice) || 0;

          return {
            ...item,
            name: this.scrubBranding(item.name),
            description: this.scrubBranding(item.description || item.name),
            basePrice: resolvedPrice,
            categoryId: `${r.id}-${cat.id}`, // Match the newly prefixed category IDs
            categoryName: cat.name,
          };
        }),
      ),
    );

    const filtered = allItems.filter((item) =>
      categoryIds.includes(item.categoryId),
    );
    console.log('--- WIZARD DEBUG: ITEM COUNT ---', filtered.length);

    // Fix #4 — Modifiers mapping
    return filtered.map((item) => this.attachModifiers(item));
  }

  private attachModifiers(item: any) {
    // Fix #4 — Consolidate ALL possible modifier types and safely extract names
    const extractNames = (arr: any[]) => {
      if (!arr || !Array.isArray(arr)) return [];
      return arr
        .map((m) => (typeof m === 'string' ? m : m.name))
        .filter(Boolean);
    };

    const consolidatedModifiers = [
      ...extractNames(item.modifiers),
      ...extractNames(item.options), // Sizes/Options
      ...extractNames(item.crusts),
      ...extractNames(item.sauces),
      ...extractNames(item.toppings),
      ...extractNames(item.flavors),
      ...extractNames(item.dressings),
    ];

    const finalItem = {
      ...item,
      // Fix #4 — Standardize to string[] for the UI
      modifiers: [...new Set(consolidatedModifiers)],
    };

    console.log(
      `--- WIZARD DEBUG: MODIFIERS [${item.name}] ---`,
      finalItem.modifiers,
    );
    return finalItem;
  }

  async bulkCreateWizard(data: any) {
    try {
      const { storeIds, categories } = data;
      if (!storeIds?.length || !categories?.length) {
        return {
          success: false,
          message: 'Missing data: storeIds and categories are required',
        };
      }

      // 1. Get businessId from first store
      const site = await this.siteRepository.findOne({
        where: { id: storeIds[0] },
      });
      if (!site) {
        throw new NotFoundException(`Site with ID ${storeIds[0]} not found`);
      }
      const businessId = site.businessId;

      // 2. Create the Menu
      const menu = await this.menuRepository.save(
        this.menuRepository.create({
          name:
            data.name || `AI Wizard Menu ${new Date().toLocaleDateString()}`,
          description: data.description || 'Generated by Abigail AI Assistant',
          seoTags: data.seoTags || '',
          businessId,
          currency: data.currency || 'GBP',
        }),
      );

      if (
        data.globalAttributes &&
        Object.keys(data.globalAttributes).length > 0
      ) {
        menu.globalAttributes = data.globalAttributes;
        await this.menuRepository.save(menu);
      }

      // 3. Resolve all target sites to get their storeIds and currencies
      const sites = await this.siteRepository.find({
        where: storeIds.map((id) => ({ id })),
      });

      if (sites.length === 0) {
        return {
          success: false,
          message: 'No valid sites found for allocation',
        };
      }

      // 4. Process Categories, Products, and MenuItems
      for (const catData of categories) {
        const category = await this.menuCategoryRepository.save(
          this.menuCategoryRepository.create({
            menuId: menu.id,
            name: this.scrubBranding(catData.name),
            description: this.scrubBranding(catData.description || ''),
            seoTags: catData.seoTags || '',
            sortOrder: 0,
          }),
        );

        if (catData.items && Array.isArray(catData.items)) {
          for (const itemData of catData.items) {
            // Create global product
            const product = await this.productRepository.save(
              this.productRepository.create({
                name: this.scrubBranding(itemData.name),
                businessId: businessId,
                price: (Number(itemData.basePrice) || 0) / 100,
                sku:
                  itemData.sku ||
                  `AI-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                category: category.name,
                status: 'active',
                stock: itemData.stock !== undefined ? itemData.stock : 999,
              }),
            );

            // Link to menu
            const menuItem = await this.menuItemRepository.save(
              this.menuItemRepository.create({
                menuId: menu.id,
                categoryId: category.id,
                productId: product.id,
                displayName: this.scrubBranding(itemData.name),
                description: this.scrubBranding(itemData.description || ''),
                seoTags: itemData.seoTags || '',
                isAvailable: true,
                sortOrder: 0,
              }),
            );

            if (itemData.itemAttributes) {
              menuItem.itemAttributes = itemData.itemAttributes;
              await this.menuItemRepository.save(menuItem);
            }

            // 5. Create Pricing for ALL selected sites
            for (const site of sites) {
              const siteSpecificPrice = itemData.storePrices?.[site.id];
              const priceToUse =
                siteSpecificPrice !== undefined
                  ? (Number(siteSpecificPrice) || 0) / 100
                  : (Number(itemData.basePrice) || 0) / 100;

              await this.pricingRepository.save(
                this.pricingRepository.create({
                  businessId,
                  productId: product.id,
                  siteId: site.id,
                  storeId: site.storeId ?? undefined, // Using undefined to satisfy strict types if needed, although entity now allows null
                  amount: priceToUse,
                  currency: site.currency || menu.currency || 'GBP',
                  isDefault: false,
                }),
              );
            }

            // 6. Process Modifiers
            if (itemData.modifiers && Array.isArray(itemData.modifiers)) {
              for (const modData of itemData.modifiers) {
                // Create Modifier Group
                const modifier = await this.modifierRepository.save(
                  this.modifierRepository.create({
                    businessId,
                    name: this.scrubBranding(modData.name),
                    modifierType: modData.type || 'single_select',
                    isRequired: modData.type === 'single_select',
                    minSelections: modData.type === 'single_select' ? 1 : 0,
                    maxSelections: modData.type === 'single_select' ? 1 : 99,
                    status: 'active',
                    source: 'ai_generated',
                  }),
                );

                // Link Modifier to Menu Item
                await this.menuItemModifierRepository.save(
                  this.menuItemModifierRepository.create({
                    menuItemId: menuItem.id,
                    modifierId: modifier.id,
                    displayOrder: 0,
                    isActive: true,
                  }),
                );

                // Process Options
                if (modData.options && Array.isArray(modData.options)) {
                  for (const optData of modData.options) {
                    const priceMod = Number(optData.priceModifier) || 0;

                    const option = await this.modifierOptionRepository.save(
                      this.modifierOptionRepository.create({
                        modifierId: modifier.id,
                        name: this.scrubBranding(optData.name),
                        priceModifier: priceMod, // Frontend sends in cents usually
                        isDefault: !!optData.isDefault,
                        isActive: true,
                      }),
                    );

                    // Save site-specific pricing for options (allocating to physical stores)
                    for (const site of sites) {
                      const siteSpecificPriceMod =
                        optData.storePrices?.[site.id];

                      if (siteSpecificPriceMod !== undefined && site.storeId) {
                        await this.modifierOptionPricingRepository.save(
                          this.modifierOptionPricingRepository.create({
                            modifierOptionId: option.id,
                            storeId: site.storeId,
                            priceModifier: Number(siteSpecificPriceMod) || 0,
                            isActive: true,
                          }),
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 7. Final Site-Menu Link
      for (const site of sites) {
        // Deactivate existing menus for this site
        await this.siteMenuRepository.update(
          { siteId: site.id },
          { isActive: false },
        );

        await this.siteMenuRepository.save(
          this.siteMenuRepository.create({
            siteId: site.id,
            menuId: menu.id,
            isActive: true,
          }),
        );
      }

      return { success: true, menuId: menu.id };
    } catch (error) {
      console.error('[MenusService] bulkCreateWizard failed:', error);
      throw error;
    }
  }

  async generateAIContent(body: {
    type: string;
    name?: string;
    storeName?: string;
    intent?: string;
    restaurantName?: string;
    categoryName?: string;
    businessType?: string;
  }) {
    const {
      type,
      name,
      storeName,
      intent,
      restaurantName,
      categoryName,
      businessType,
    } = body;

    const schema = z.object({
      description: z.string().describe('Compelling, appetizing description'),
      seoTags: z.string().describe('Comma-separated SEO keywords'),
    });

    const systemPrompt = `You are Abigail, an expert SEO copywriter for restaurant and retail menus. Your task is to create compelling descriptions and SEO-optimized keywords.

SEO KEYWORD BEST PRACTICES:
- Use descriptive adjectives: fresh, artisan, premium, authentic, homemade, handcrafted
- Include dietary attributes: halal, vegan, vegetarian, gluten-free, dairy-free, organic
- Add culinary styles: traditional, gourmet, signature, specialty, fusion, artisanal
- Preparation methods: grilled, fried, baked, steamed, roasted, slow-cooked
- Quality indicators: locally-sourced, imported, seasonal, farm-to-table
- Taste profiles: spicy, mild, savory, sweet, tangy, rich, light
- DO NOT repeat the product/category name in tags
- Use lowercase, comma-separated format
- Aim for 5-8 highly relevant keywords

DESCRIPTION WRITING RULES:
- Make it enticing and mouth-watering
- Highlight unique selling points
- Mention key ingredients or features
- Use sensory and emotional language
- Keep concise (1-3 sentences)
- Match the tone to the business type (upscale, casual, fast-food, etc.)`;

    let userPrompt = '';

    if (type === 'category') {
      const context = restaurantName ? ` at ${restaurantName}` : '';
      userPrompt = `Generate a compelling category description and SEO tags for a menu category named "${name}"${context}.

Category Context: This is a ${businessType || 'food'} business category.

Requirements:
- Description: Write 2-3 sentences describing what customers can expect from this category
- SEO Tags: Provide 5-8 relevant keywords that help customers discover this category
- Make it appetizing and professional

Example Output:
Description: "Explore our handcrafted starters, featuring fresh ingredients and bold flavors. From crispy appetizers to savory small plates, each dish is designed to awaken your palate."
SEO Tags: "appetizers, starters, small plates, shareable, fresh, handcrafted, crispy, savory"`;
    } else if (type === 'item') {
      const context = categoryName ? ` in the ${categoryName} category` : '';
      const restaurant = restaurantName ? ` at ${restaurantName}` : '';
      userPrompt = `Generate a delicious product description and SEO keywords for a menu item named "${name}"${context}${restaurant}.

Item Context: This is a ${businessType || 'food'} product.

Requirements:
- Description: Write 1-2 enticing sentences highlighting what makes this item special
- SEO Tags: Provide 5-8 specific keywords for search optimization
- Focus on ingredients, preparation, taste, or unique features

Example Output:
Description: "Tender grilled chicken breast marinated in aromatic herbs and spices, served with seasonal vegetables and garlic butter sauce."
SEO Tags: "grilled, chicken, halal, protein-rich, herb-marinated, tender, healthy, signature"`;
    } else if (type === 'discovery') {
      userPrompt = `Generate a compelling catalog description and comprehensive SEO tags for "${storeName}".

Business Overview: ${intent}
Business Type: ${businessType || 'food'}

Requirements:
- Description: Write a 2-3 sentence overview that captures the essence of this business
- SEO Tags: Provide 10-12 diverse keywords covering cuisine, style, dietary options, and unique selling points

Example Output:
Description: "Welcome to ${storeName}, where authentic flavors meet modern dining. We specialize in fresh, high-quality dishes crafted with passion and served with pride."
SEO Tags: "restaurant, local, fresh ingredients, family-friendly, takeaway, delivery, authentic, quality, affordable, halal options, vegetarian options, signature dishes"`;
    }

    try {
      const googleApiKey =
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const openRouterApiKey =
        process.env.OPENROUTER_API_KEY || process.env.openrouter_api_key;
      const openAiApiKey = process.env.OPENAI_API_KEY;

      let lastError: any = null;

      // 1. Try Google Gemini
      if (googleApiKey) {
        try {
          const googleAI = createGoogleGenerativeAI({ apiKey: googleApiKey });
          const { object } = await generateObject({
            model: googleAI('gemini-flash-latest'),
            schema,
            prompt: `${systemPrompt}\n\n${userPrompt}`,
          });
          return object;
        } catch (error) {
          console.warn(
            '[MenusService] Google AI failed, falling back...',
            error?.message,
          );
          lastError = error;
        }
      }

      // 2. Try OpenRouter (Fallback 1)
      if (openRouterApiKey) {
        try {
          const openrouter = createOpenRouter({ apiKey: openRouterApiKey });

          // Using generateText with JSON parsing for OpenRouter to avoid strict schema issues
          const textPrompt = `${systemPrompt}\n\n${userPrompt}\n\nYou MUST respond with ONLY a valid JSON object matching this exact structure:\n{\n  "description": "string",\n  "seoTags": "string"\n}`;

          const result = await generateText({
            model: openrouter('openai/gpt-4o-mini'),
            messages: [{ role: 'user', content: textPrompt }],
          });

          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch)
            throw new Error('OpenRouter did not return valid JSON');

          return schema.parse(JSON.parse(jsonMatch[0]));
        } catch (error) {
          console.warn(
            '[MenusService] OpenRouter failed, falling back...',
            error?.message,
          );
          lastError = error;
        }
      }

      // 3. Try OpenAI (Fallback 2)
      if (openAiApiKey) {
        try {
          const openai = createOpenAI({ apiKey: openAiApiKey });
          const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema,
            prompt: `${systemPrompt}\n\n${userPrompt}`,
          });
          return object;
        } catch (error) {
          console.warn('[MenusService] OpenAI failed...', error?.message);
          lastError = error;
        }
      }

      if (!googleApiKey && !openRouterApiKey && !openAiApiKey) {
        throw new Error(
          'No AI API keys configured (Google, OpenRouter, or OpenAI)',
        );
      }

      throw lastError || new Error('All AI providers failed');
    } catch (error: any) {
      console.error(
        '[MenusService] generateAIContent failed:',
        error?.message || error,
      );
      throw error;
    }
  }

  /**
   * Generate intelligent modifier suggestions for a menu item using AI
   */
  async generateModifiers(body: {
    itemName: string;
    categoryName?: string;
    restaurantName?: string;
    businessType?: string;
    userPrompt?: string;
  }) {
    try {
      const {
        itemName,
        categoryName,
        restaurantName,
        businessType,
        userPrompt,
      } = body;

      const schema = z.object({
        modifiers: z.array(
          z.object({
            name: z
              .string()
              .describe(
                'Modifier group name (e.g., "Size", "Toppings", "Add-ons")',
              ),
            type: z
              .enum(['single_select', 'multi_select'])
              .describe('Selection type'),
            required: z.boolean().describe('Is this modifier required?'),
            options: z.array(
              z.object({
                name: z.string().describe('Option name'),
                priceModifier: z
                  .number()
                  .describe(
                    'Price change in cents (can be 0, positive, or negative)',
                  ),
                isDefault: z
                  .boolean()
                  .default(false)
                  .describe('Is this the default option?'),
              }),
            ),
            icon: z
              .string()
              .default('')
              .describe('Emoji icon for the modifier group'),
          }),
        ),
      });

      const systemPrompt = `You are Abigail, an expert POS system designer for restaurants and cafes.

Your task is to generate intelligent, practical modifiers for menu items that enhance the customer ordering experience.

MODIFIER DESIGN PRINCIPLES:
1. **Common Modifiers**: Start with industry-standard modifiers (Size, Toppings, Add-ons, Sauces, etc.)
2. **Contextual Awareness**: Consider the category, business type, and item name
3. **Price Logic**:
   - Base size/option should be 0 cents modifier
   - Upgrades (larger size, premium ingredients) should add cost
   - Downgrades (smaller, remove ingredients) can subtract cost
4. **Selection Types**:
   - single_select: Size, Spice Level, Preparation Style (customer picks ONE)
   - multi_select: Toppings, Add-ons, Sauces (customer can pick MULTIPLE)
5. **Required vs Optional**:
   - Size modifiers are usually REQUIRED
   - Toppings and add-ons are usually OPTIONAL
6. **Realistic Options**: Include 3-8 options per modifier (not too few, not overwhelming)
7. **Dietary Considerations**: Include vegetarian/vegan/halal options when relevant

EXAMPLES:
- Pizza: Size (required), Crust Style (optional), Meat Toppings (optional), Veggie Toppings (optional)
- Coffee: Size (required), Milk Choice (optional), Espresso Shots (optional), Flavor Syrup (optional)
- Burger: Size (optional), Protein Choice (required), Cheese (optional), Toppings (optional), Sauce (optional)
- Sandwich: Size (required), Bread Type (required), Add-ons (optional)

PRICING GUIDELINES:
- Small/Medium/Large: 0 / +$2-3 / +$4-5
- Premium ingredients: +$1-3
- Standard toppings: +$0.50-1.50
- Extra sauces: +$0.50`;

      const userMessage = userPrompt
        ? `Generate modifiers for "${itemName}" based on this request: "${userPrompt}"`
        : `Generate appropriate modifiers for "${itemName}"${categoryName ? ` in the ${categoryName} category` : ''}${restaurantName ? ` at ${restaurantName}` : ''}${businessType ? ` (${businessType} business)` : ''}.

Include the most relevant and practical modifiers that customers would expect for this item.`;

      const googleApiKey =
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      const openAiApiKey = process.env.OPENAI_API_KEY;

      let result: any = null;
      let lastError: any = null;

      // Try Google Gemini first
      if (googleApiKey) {
        try {
          const googleAI = createGoogleGenerativeAI({ apiKey: googleApiKey });
          const { object } = await generateObject({
            model: googleAI('gemini-flash-latest'),
            schema,
            system: systemPrompt,
            prompt: userMessage,
            temperature: 0.8, // Higher temperature for more creative modifier suggestions
          });
          result = object;
        } catch (err: any) {
          lastError = err;
          console.warn('[generateModifiers] Google failed:', err.message);
        }
      }

      // Fallback to OpenRouter
      if (!result && openRouterApiKey) {
        try {
          const openrouter = createOpenRouter({ apiKey: openRouterApiKey });
          const { object } = await generateObject({
            model: openrouter('openai/gpt-4o-mini'),
            schema,
            system: systemPrompt,
            prompt: userMessage,
            temperature: 0.8,
          });
          result = object;
        } catch (err: any) {
          lastError = err;
          console.warn('[generateModifiers] OpenRouter failed:', err.message);
        }
      }

      // Fallback to OpenAI
      if (!result && openAiApiKey) {
        try {
          const openai = createOpenAI({ apiKey: openAiApiKey });
          const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema,
            system: systemPrompt,
            prompt: userMessage,
            temperature: 0.8,
          });
          result = object;
        } catch (err: any) {
          lastError = err;
          console.warn('[generateModifiers] OpenAI failed:', err.message);
        }
      }

      if (!result) {
        throw (
          lastError ||
          new Error('All AI providers failed for modifier generation')
        );
      }

      return result;
    } catch (error: any) {
      console.error('[generateModifiers] failed:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get intelligent reusable modifier suggestions based on product category
   */
  async suggestReusableModifiers(body: {
    categoryName: string;
    itemName: string;
    businessType?: string;
  }) {
    try {
      const { categoryName, itemName, businessType } = body;

      // Normalize category name to match template slugs
      const categorySlug = categoryName.toLowerCase().replace(/s$/, ''); // Remove plural

      // Find matching templates
      const templates = await this.modifierTemplateRepository.find({
        where: [
          { categorySlug, isActive: true },
          { isUniversal: true, isActive: true },
        ],
        order: { displayOrder: 'ASC', usageCount: 'DESC' },
      });

      // Filter by business type if provided
      let filteredTemplates = templates;
      if (businessType) {
        const businessTypeUpper = businessType.toUpperCase();
        filteredTemplates = templates.filter(
          (t) =>
            t.businessType === businessTypeUpper ||
            t.businessType === 'UNIVERSAL',
        );
      }

      // Convert templates to frontend-friendly format
      const suggestions = filteredTemplates.map((template) => ({
        id: template.id,
        slug: template.modifierSlug,
        name: template.modifierName,
        type: template.modifierType,
        required: template.isRequired,
        options: template.options,
        icon: template.icon || '',
        description: template.description || '',
        isUniversal: template.isUniversal,
        displayOrder: template.displayOrder,
        usageCount: template.usageCount,
      }));

      return {
        suggestions,
        categorySlug,
        totalFound: suggestions.length,
      };
    } catch (error: any) {
      console.error(
        '[suggestReusableModifiers] failed:',
        error?.message || error,
      );
      throw error;
    }
  }

  async remove(id: string, siteId?: string) {
    try {
      if (siteId) {
        // If siteId is provided, we only want to remove the link for this specific site
        const siteMenu = await this.siteMenuRepository.findOne({
          where: { menuId: id, siteId },
        });

        if (!siteMenu) {
          throw new NotFoundException(
            `Menu with ID ${id} is not linked to Site ${siteId}`,
          );
        }

        await this.siteMenuRepository.remove(siteMenu);

        // Check if this menu is still used by any other sites
        const remainingUsage = await this.siteMenuRepository.count({
          where: { menuId: id },
        });

        // If no other sites use this menu, we can safely delete the menu itself
        if (remainingUsage === 0) {
          const menu = await this.menuRepository.findOne({ where: { id } });
          if (menu) {
            await this.menuRepository.remove(menu);
          }
        }
        return { success: true, unlinked: true };
      }

      // Default behavior: Hard delete the menu (and cascade to all sites)
      const menu = await this.menuRepository.findOne({ where: { id } });
      if (!menu) {
        throw new NotFoundException(`Menu with ID ${id} not found`);
      }
      return await this.menuRepository.remove(menu);
    } catch (error) {
      console.error('[MenusService] remove failed:', error);
      throw error;
    }
  }

  async setGlobalAttributes(
    menuId: string,
    attributes: Record<string, any>,
  ): Promise<Menu> {
    const menu = await this.menuRepository.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException(`Menu ${menuId} not found`);
    menu.globalAttributes = { ...(menu.globalAttributes ?? {}), ...attributes };
    return this.menuRepository.save(menu);
  }

  async setItemAttributes(
    itemId: string,
    attributes: Record<string, any>,
  ): Promise<MenuItem> {
    const item = await this.menuItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException(`Menu item ${itemId} not found`);
    item.itemAttributes = { ...(item.itemAttributes ?? {}), ...attributes };
    return this.menuItemRepository.save(item);
  }
}
