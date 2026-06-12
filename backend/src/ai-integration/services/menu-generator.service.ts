import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { streamText } from 'ai';
import { MenuTemplate } from '../../menus/entities/menu-template.entity';
import { ProductTemplate } from '../../menus/entities/product-template.entity';
import { ModifierTemplate } from '../../menus/entities/modifier-template.entity';
import { ItemCategoryTemplate } from '../../menus/entities/item-category-template.entity';
import { MenuTemplateMatcherService } from './menu-template-matcher.service';
import { MenuCacheService } from './menu-cache.service';
import { AiConfiguration } from '../entities/ai-configuration.entity';
import { AiUsage } from '../entities/ai-usage.entity';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import * as path from 'path';
import * as fs from 'fs';
import { In } from 'typeorm';

export interface MenuGenerationRequest {
  businessType: string;
  businessName: string;
  keywords: string[]; // ['pizza', 'halal', 'delivery']
  dietaryNeeds?: string[]; // ['Halal', 'Vegetarian']
}

@Injectable()
export class MenuGeneratorService {
  constructor(
    @InjectRepository(MenuTemplate)
    private readonly templateRepo: Repository<MenuTemplate>,
    @InjectRepository(ProductTemplate)
    private readonly productTemplateRepo: Repository<ProductTemplate>,
    @InjectRepository(ModifierTemplate)
    private readonly modifierTemplateRepo: Repository<ModifierTemplate>,
    @InjectRepository(ItemCategoryTemplate)
    private readonly categoryTemplateRepo: Repository<ItemCategoryTemplate>,
    @InjectRepository(AiConfiguration)
    private readonly aiConfigRepo: Repository<AiConfiguration>,
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
    private readonly templateMatcherService: MenuTemplateMatcherService,
    private readonly menuCacheService: MenuCacheService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  /**
   * Main entry point: 3-tier menu generation
   * Tier 1: DB Template → Tier 2: Redis Cache → Tier 3: AI Generation
   */
  async generateMenu(
    request: MenuGenerationRequest,
    tenantId: string,
    res: Response,
  ): Promise<void> {
    console.log('\n========== MENU GENERATION REQUEST ==========');
    console.log(`Business: ${request.businessName} (${request.businessType})`);
    console.log(`Keywords: ${request.keywords.join(', ')}`);
    console.log(`Dietary: ${request.dietaryNeeds?.join(', ') || 'None'}`);

    // ========== TIER 1: DB TEMPLATE HIT ==========
    const dbTemplate = await this.templateMatcherService.findMatchingTemplate({
      businessType: request.businessType,
      keywords: request.keywords,
      dietaryNeeds: request.dietaryNeeds,
    });

    if (dbTemplate) {
      const isGranular = dbTemplate.id === 'granular-construction';
      console.log(
        `✅ [TIER 1] ${isGranular ? 'Granular' : 'DB'} Template Hit - 0 tokens used`,
      );

      const personalizedMenu = this.personalizeTemplate(
        dbTemplate,
        request.businessName,
      );
      res.json({
        success: true,
        data: personalizedMenu,
        meta: {
          source: isGranular ? 'granular_templates' : 'db_template',
          template_id: dbTemplate.id,
          template_name: dbTemplate.templateName,
          tokens_used: 0,
          cost_usd: 0,
        },
      });
      return;
    }

    // ========== TIER 2: REDIS CACHE HIT ==========
    const cacheKey = this.menuCacheService.generateCacheKey({
      businessType: request.businessType,
      keywords: request.keywords,
      dietaryNeeds: request.dietaryNeeds,
    });

    const cachedMenu = await this.menuCacheService.getCachedMenu(
      tenantId,
      cacheKey,
    );

    if (cachedMenu) {
      console.log(
        `✅ [TIER 2] Redis Cache Hit - Saved ${cachedMenu.metadata.tokens_used} tokens`,
      );
      // Personalize cached content
      const personalizedContent = cachedMenu.content.replace(
        /\[BUSINESS_NAME\]/g,
        request.businessName,
      );
      await this.menuCacheService.simulateStream(personalizedContent, res);
      return;
    }

    // ========== TIER 3: AI GENERATION ==========
    console.log('🤖 [TIER 3] AI Generation - Using Gemini API');
    await this.generateWithAI(request, tenantId, cacheKey, res);
  }

  /**
   * Tier 3: Generate menu using AI (Gemini 2.5 Flash-Lite)
   */
  private async generateWithAI(
    request: MenuGenerationRequest,
    tenantId: string,
    cacheKey: string,
    res: Response,
  ): Promise<void> {
    // Get AI configuration (using userId as tenantId)
    const config = await this.aiConfigRepo.findOne({
      where: { userId: tenantId },
    });
    if (!config) {
      throw new NotFoundException(
        'No AI configuration found. Please configure AI in settings.',
      );
    }

    // Check budget
    if (config.currentSpendingUsd >= config.monthlyBudgetUsd) {
      throw new BadRequestException(
        'Monthly AI budget exceeded. Please increase your budget or wait until next month.',
      );
    }

    // Build system prompt with Universal-Menu.json reference
    const systemPrompt = await this.buildMenuCreationPrompt(request);

    // Build model via AiProviderRouter
    const model = this.aiRouter.getModel('specialist');

    const startTime = Date.now();
    let fullResponse = '';

    try {
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: `Create a complete menu for "${request.businessName}", a ${request.businessType} business.

**Requirements:**
- Keywords: ${request.keywords.join(', ')}
${request.dietaryNeeds ? `- Dietary Standards: ${request.dietaryNeeds.join(', ')}` : ''}

**Output Format (JSON):**
{
  "business_name": "[BUSINESS_NAME]",
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "base_price": 1299,
          "description": "Item description",
          "dietary_status": "halal|non_halal|vegetarian|vegan",
          "modifiers": ["mod_size", "mod_toppings"]
        }
      ]
    }
  ],
  "modifiers": [
    {
      "id": "mod_size",
      "name": "Size",
      "options": [
        { "name": "Small", "price_delta": 0 },
        { "name": "Large", "price_delta": 300 }
      ]
    }
  ]
}

Use realistic prices in cents (e.g., 1299 = $12.99).
Include 3-5 categories with 5-10 items each.
Add relevant modifiers based on business type.`,
        onFinish: async ({ usage, text }) => {
          const responseTime = Date.now() - startTime;
          fullResponse = text;

          // Log usage
          await this.logUsage(tenantId, usage, config.model);

          // Save to Redis cache (with placeholder for business name)
          const cacheableContent = text.replace(
            new RegExp(request.businessName, 'g'),
            '[BUSINESS_NAME]',
          );
          await this.menuCacheService.saveCachedMenu(
            tenantId,
            cacheKey,
            cacheableContent,
            {
              tokens_used: usage.totalTokens || 0,
              response_time_ms: responseTime,
            },
          );

          // Save as new template if worthy
          if (this.shouldSaveAsTemplate(request, usage)) {
            await this.saveAsTemplate(request, text);
          }

          console.log(
            `✅ AI Generation complete - ${usage.totalTokens} tokens, ${responseTime}ms`,
          );
        },
      });

      // Stream to client
      result.pipeTextStreamToResponse(res);
    } catch (error) {
      console.error('[Menu Generator] AI generation failed:', error);
      throw new BadRequestException(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt with Abigail's personality, Universal-Menu.json reference,
   * and granular templates (categories, products, modifiers)
   */
  private async buildMenuCreationPrompt(
    request: MenuGenerationRequest,
  ): Promise<string> {
    // 1. Load Universal-Menu.json
    const universalMenuPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'docs',
      'Menus',
      'Universal-Menu.json',
    );
    let universalMenuReference = '';

    try {
      if (fs.existsSync(universalMenuPath)) {
        const universalMenu = JSON.parse(
          fs.readFileSync(universalMenuPath, 'utf-8'),
        );
        universalMenuReference = JSON.stringify(universalMenu, null, 2);
      }
    } catch (error) {
      console.warn(
        '[Menu Generator] Could not load Universal-Menu.json:',
        error.message,
      );
    }

    // 2. Fetch Granular Templates
    const [categories, products, modifiers] = await Promise.all([
      this.categoryTemplateRepo.find({
        where: [
          { businessType: request.businessType as any, isActive: true },
          { isUniversal: true, isActive: true },
        ],
        take: 10,
      }),
      this.productTemplateRepo.find({
        where: { businessType: request.businessType as any, isActive: true },
        take: 20,
      }),
      this.modifierTemplateRepo.find({
        where: [
          { businessType: request.businessType as any, isActive: true },
          { isUniversal: true, isActive: true },
        ],
        take: 15,
      }),
    ]);

    const granularTemplatesInfo = `
**Available Granular Templates:**
- Categories: ${categories.map((c) => c.categoryName).join(', ')}
- Example Products: ${products
      .slice(0, 10)
      .map((p) => p.productName)
      .join(', ')}
- Modifiers: ${modifiers.map((m) => m.modifierName).join(', ')}
`;

    return `You are Abigail, an expert menu designer and AI assistant for Dive POS.

**About You:**
You help ${request.businessType} businesses create perfect menus by combining industry expertise with personalized guidance. You're knowledgeable, helpful, and detail-oriented.

**Your Task:**
Create a complete, production-ready menu for a new business.

**Business Context:**
- Type: ${request.businessType}
- Focus: ${request.keywords.join(', ')}
${request.dietaryNeeds ? `- Dietary Requirements: ${request.dietaryNeeds.join(', ')}` : ''}

${granularTemplatesInfo}

**Reference Template (use this structure):**
${universalMenuReference ? `\`\`\`json\n${universalMenuReference.slice(0, 1500)}...\n\`\`\`` : 'No reference available'}

**Guidelines:**
1. **Categories**: Use the suggested categories where relevant.
2. **Items**: Include the example products and create new ones that fit the business focus.
3. **Pricing**: Use cents (1299 = $12.99), competitive market rates.
4. **Modifiers**: Attach relevant modifiers to products.
5. **Dietary Classification**: Mark items as halal/non_halal/vegetarian/vegan.
${request.dietaryNeeds?.includes('Halal') ? '6. **Halal Enforcement**: Replace pork with turkey/beef alternatives (e.g., Pork Bacon -> Turkey Bacon).' : ''}

**Output:** Return ONLY valid JSON, no markdown formatting.`;
  }

  /**
   * Personalize DB template with business name
   */
  private personalizeTemplate(
    template: MenuTemplate,
    businessName: string,
  ): any {
    const data = JSON.parse(JSON.stringify(template.templateData));
    return {
      business_name: businessName,
      template_used: template.templateName,
      ...data,
    };
  }

  /**
   * Determine if AI-generated menu should be saved as reusable template
   */
  private shouldSaveAsTemplate(
    request: MenuGenerationRequest,
    usage: { totalTokens?: number },
  ): boolean {
    // Save if:
    // 1. Efficient generation (< 1500 tokens)
    // 2. Common business type
    // 3. Not too specific (max 3 keywords)
    return (
      (usage.totalTokens || 0) < 1500 &&
      ['RESTAURANT', 'CAFE', 'RETAIL', 'BAR'].includes(request.businessType) &&
      request.keywords.length <= 3
    );
  }

  /**
   * Save AI-generated menu as new template for future reuse
   */
  private async saveAsTemplate(
    request: MenuGenerationRequest,
    generatedContent: string,
  ): Promise<void> {
    try {
      const parsed = JSON.parse(generatedContent);

      const cuisine = request.keywords.find((kw) =>
        [
          'Italian',
          'Indian',
          'Mexican',
          'Chinese',
          'Thai',
          'Korean',
          'Japanese',
        ].some((c) => c.toLowerCase() === kw.toLowerCase()),
      );

      const templateName = [
        'AI Generated:',
        request.businessType,
        cuisine || '',
        request.dietaryNeeds?.[0] || '',
      ]
        .filter(Boolean)
        .join(' - ');

      await this.templateRepo.save({
        businessType: request.businessType as any,
        cuisineType: cuisine || null,
        dietaryCategory: request.dietaryNeeds?.[0] || null,
        templateName,
        templateData: parsed,
        usageCount: 1,
        confidenceScore: 0.75, // AI-generated = lower confidence than human-curated
        isActive: true,
      });

      console.log(`💾 Saved as new template: "${templateName}"`);
    } catch (error) {
      console.warn(
        '[Menu Generator] Failed to save as template:',
        error.message,
      );
    }
  }

  /**
   * Log AI usage for budget tracking
   */
  private async logUsage(
    tenantId: string,
    usage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    },
    model: string,
  ): Promise<void> {
    // DeepSeek pricing + Gemini fallback
    const costs = {
      // DeepSeek V4-Flash (primary for specialists)
      'deepseek-chat': { input: 0.14 / 1_000_000, output: 0.28 / 1_000_000 },
      // DeepSeek V4-Flash cache hit (input almost free)
      'deepseek-chat-cached': {
        input: 0.0028 / 1_000_000,
        output: 0.28 / 1_000_000,
      },
      // DeepSeek V4-Pro (Researcher — discounted rate until 2026-05-31, then full)
      'deepseek-reasoner': {
        input: 0.435 / 1_000_000,
        output: 0.87 / 1_000_000,
      },
      // Gemini fallback rates (kept for accuracy when fallback fires)
      'gemini-flash-latest': {
        input: 0.1 / 1_000_000,
        output: 0.4 / 1_000_000,
      },
      'gemini-2.0-flash': { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
    };

    const modelCost = costs[model] || costs['deepseek-chat'];
    const costUsd =
      (usage.promptTokens || 0) * modelCost.input +
      (usage.completionTokens || 0) * modelCost.output;

    // Save usage record
    await this.usageRepo.save({
      tenantId,
      siteId: null, // Menu creation is tenant-level
      tokensInput: usage.promptTokens || 0,
      tokensOutput: usage.completionTokens || 0,
      costUsd,
      model,
    });

    // Update tenant spending (userId is the tenant identifier)
    await this.aiConfigRepo
      .createQueryBuilder()
      .update()
      .set({
        currentSpendingUsd: () => `current_spending_usd + ${costUsd}`,
      })
      .where({ userId: tenantId })
      .execute();

    console.log(
      `💰 Cost: $${costUsd.toFixed(6)} (${usage.totalTokens} tokens)`,
    );
  }
}
