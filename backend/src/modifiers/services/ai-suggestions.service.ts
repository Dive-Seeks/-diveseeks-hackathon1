import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModifierTemplate } from '../../menus/entities/modifier-template.entity';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * AI Suggestions Service
 *
 * Uses AI to suggest relevant modifier bundles based on menu item analysis.
 * Combines template matching with AI-powered ranking.
 */
@Injectable()
export class AiSuggestionsService {
  private readonly logger = new Logger(AiSuggestionsService.name);

  constructor(
    @InjectRepository(ModifierTemplate)
    private readonly templateRepository: Repository<ModifierTemplate>,
  ) {}

  /**
   * Suggest modifier bundles for a menu item
   */
  async suggestBundles(params: {
    itemName: string;
    categorySlug?: string;
    businessType: 'RESTAURANT' | 'RETAIL' | 'CAFE' | 'BAR' | 'HYBRID';
    description?: string;
  }) {
    this.logger.log(`Generating modifier suggestions for: ${params.itemName}`);

    try {
      // 1. Fetch relevant templates from database
      const templates = await this.fetchRelevantTemplates(
        params.categorySlug,
        params.businessType,
      );

      if (templates.length === 0) {
        this.logger.warn('No templates found in database');
        return {
          recommendedBundle: {
            modifiers: [],
            estimatedCompletionTime: '< 1 minute',
            comparableRestaurants: 0,
          },
          allTemplates: [],
        };
      }

      // 2. Use AI to rank and select best templates
      const rankedTemplates = await this.rankTemplatesWithAI(
        params.itemName,
        params.description || '',
        templates,
      );

      // 3. Select top 3-5 for recommended bundle
      const recommendedModifiers = rankedTemplates
        .slice(0, 5)
        .filter((t) => t.relevanceScore >= 0.7); // Only include highly relevant

      return {
        recommendedBundle: {
          modifiers: recommendedModifiers.map((t) => ({
            templateId: t.template.id,
            modifierSlug: t.template.modifierSlug,
            name: t.template.modifierName,
            type: t.template.modifierType,
            isRequired: t.template.isRequired,
            options: t.template.options,
            icon: t.template.icon,
            description: t.template.description,
            relevanceScore: t.relevanceScore,
            reasoning: t.reasoning,
          })),
          estimatedCompletionTime: '< 1 minute',
          comparableRestaurants: this.estimateComparableRestaurants(
            params.categorySlug,
          ),
        },
        allTemplates: rankedTemplates.map((t) => ({
          templateId: t.template.id,
          modifierSlug: t.template.modifierSlug,
          name: t.template.modifierName,
          type: t.template.modifierType,
          categorySlug: t.template.categorySlug,
          businessType: t.template.businessType,
          isUniversal: t.template.isUniversal,
          icon: t.template.icon,
          relevanceScore: t.relevanceScore,
          reasoning: t.reasoning,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to generate suggestions:', error);
      throw error;
    }
  }

  /**
   * Fetch templates from database based on category and business type
   */
  private async fetchRelevantTemplates(
    categorySlug: string | undefined,
    businessType: string,
  ): Promise<ModifierTemplate[]> {
    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(template.categorySlug) = LOWER(:categorySlug) OR template.isUniversal = :isUniversal OR LOWER(template.businessType) = LOWER(:businessType) OR LOWER(template.businessType) = LOWER(:universal))',
        {
          categorySlug: categorySlug || '',
          isUniversal: true,
          businessType: businessType || '',
          universal: 'UNIVERSAL',
        },
      )
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.confidenceScore', 'DESC');

    return query.getMany();
  }

  /**
   * Use AI to rank templates by relevance
   */
  private async rankTemplatesWithAI(
    itemName: string,
    itemDescription: string,
    templates: ModifierTemplate[],
  ): Promise<
    Array<{
      template: ModifierTemplate;
      relevanceScore: number;
      reasoning: string;
    }>
  > {
    try {
      // Build template summary for AI
      const templateSummaries = templates.map((t, index) => ({
        index,
        slug: t.modifierSlug,
        name: t.modifierName,
        type: t.modifierType,
        category: t.categorySlug,
        businessType: t.businessType,
        isUniversal: t.isUniversal,
        description: t.description,
        options: t.options.map((o) => o.name),
      }));

      const prompt = `You are a restaurant menu expert. Analyze the menu item and suggest the most relevant modifier groups.

Menu Item: "${itemName}"
Description: "${itemDescription || 'No description provided'}"

Available Modifier Templates:
${JSON.stringify(templateSummaries, null, 2)}

For each template, provide:
1. A relevance score (0.0 to 1.0) - how relevant is this modifier for this menu item?
2. A brief reasoning (1 sentence max)

Consider:
- Does this modifier make sense for this item? (e.g., "Size" for pizza is highly relevant)
- Is this commonly used for similar items?
- Would customers expect to customize this aspect?

Return all templates ranked by relevance.`;

      const result = await generateObject({
        model: google('gemini-flash-latest'),
        schema: z.object({
          rankings: z.array(
            z.object({
              templateIndex: z.number().describe('Index of the template'),
              relevanceScore: z
                .number()
                .min(0)
                .max(1)
                .describe('Relevance score 0-1'),
              reasoning: z.string().describe('Brief explanation (1 sentence)'),
            }),
          ),
        }),
        prompt,
      });

      // Map AI rankings back to templates
      const ranked = result.object.rankings
        .map((ranking) => ({
          template: templates[ranking.templateIndex],
          relevanceScore: ranking.relevanceScore,
          reasoning: ranking.reasoning,
        }))
        .filter((r) => r.template) // Filter out invalid indices
        .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by score descending

      this.logger.log(`AI ranked ${ranked.length} templates for "${itemName}"`);

      return ranked;
    } catch (error) {
      this.logger.error(
        'AI ranking failed, falling back to usage-based:',
        error,
      );

      // Fallback: rank by usage count and category match
      return templates.map((template) => ({
        template,
        relevanceScore: this.calculateFallbackScore(template, itemName),
        reasoning: 'Ranked by usage popularity',
      }));
    }
  }

  /**
   * Fallback scoring when AI is unavailable
   */
  private calculateFallbackScore(
    template: ModifierTemplate,
    itemName: string,
  ): number {
    let score = 0.5; // Base score

    // Boost universal modifiers
    if (template.isUniversal) {
      score += 0.2;
    }

    // Boost high usage count
    if (template.usageCount > 100) {
      score += 0.2;
    } else if (template.usageCount > 10) {
      score += 0.1;
    }

    // Boost if item name contains category keywords
    const itemLower = itemName.toLowerCase();
    const categoryLower = (template.categorySlug || '').toLowerCase();

    if (categoryLower && itemLower.includes(categoryLower)) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Estimate number of comparable restaurants (for UI display)
   */
  private estimateComparableRestaurants(categorySlug?: string): number {
    // This would ideally query real analytics data
    // For now, return realistic estimates
    const estimates: Record<string, number> = {
      pizza: 1247,
      coffee: 892,
      sandwich: 634,
      burger: 1089,
      sushi: 421,
      default: 500,
    };

    return estimates[categorySlug || 'default'] || estimates.default;
  }
}
