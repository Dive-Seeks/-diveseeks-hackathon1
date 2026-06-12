import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MenuTemplate } from '../../menus/entities/menu-template.entity';
import { ProductTemplate } from '../../menus/entities/product-template.entity';
import { ModifierTemplate } from '../../menus/entities/modifier-template.entity';
import { ItemCategoryTemplate } from '../../menus/entities/item-category-template.entity';

// Simple in-memory cache
interface CacheStore {
  [key: string]: { data: any; expires: number };
}

export interface TemplateMatchQuery {
  businessType: string;
  keywords: string[]; // ['pizza', 'halal', 'delivery']
  dietaryNeeds?: string[];
}

@Injectable()
export class MenuTemplateMatcherService {
  private cache: CacheStore = {};

  constructor(
    @InjectRepository(MenuTemplate)
    private readonly templateRepo: Repository<MenuTemplate>,
    @InjectRepository(ProductTemplate)
    private readonly productTemplateRepo: Repository<ProductTemplate>,
    @InjectRepository(ModifierTemplate)
    private readonly modifierTemplateRepo: Repository<ModifierTemplate>,
    @InjectRepository(ItemCategoryTemplate)
    private readonly categoryTemplateRepo: Repository<ItemCategoryTemplate>,
  ) {}

  /**
   * Find best matching template from DB
   * Returns null if no suitable match found (proceed to cache/AI)
   */
  async findMatchingTemplate(query: TemplateMatchQuery): Promise<any | null> {
    // Step 1: Check cache for template match
    const cacheKey = `template_match:${this.generateMatchKey(query)}`;
    const cached = this.cache[cacheKey];
    if (cached && cached.expires > Date.now()) {
      console.log('[Template Matcher] ✅ Cache hit for template match');
      return cached.data;
    }

    // Step 2: Exact match (business type + dietary)
    if (query.dietaryNeeds && query.dietaryNeeds.length > 0) {
      const exactMatch = await this.templateRepo
        .createQueryBuilder('template')
        .where('template.business_type = :type', { type: query.businessType })
        .andWhere('template.dietary_category IN (:...dietary)', {
          dietary: query.dietaryNeeds,
        })
        .andWhere('template.is_active = true')
        .orderBy('template.usage_count', 'DESC')
        .addOrderBy('template.confidence_score', 'DESC')
        .getOne();

      if (exactMatch) {
        await this.recordMatch(exactMatch, cacheKey);
        return exactMatch;
      }
    }

    // Step 3: Cuisine type match
    const cuisineKeywords = this.extractCuisine(query.keywords);
    if (cuisineKeywords.length > 0) {
      const cuisineMatch = await this.templateRepo
        .createQueryBuilder('template')
        .where('template.business_type = :type', { type: query.businessType })
        .andWhere('template.cuisine_type IN (:...cuisines)', {
          cuisines: cuisineKeywords,
        })
        .andWhere('template.is_active = true')
        .orderBy('template.usage_count', 'DESC')
        .addOrderBy('template.confidence_score', 'DESC')
        .getOne();

      if (cuisineMatch) {
        await this.recordMatch(cuisineMatch, cacheKey);
        return cuisineMatch;
      }
    }

    // Step 4: Fuzzy keyword match
    const allTemplates = await this.templateRepo.find({
      where: {
        businessType: query.businessType as any,
        isActive: true,
      },
      order: {
        usageCount: 'DESC',
        confidenceScore: 'DESC',
      },
      take: 10, // Check top 10 most popular
    });

    for (const template of allTemplates) {
      const relevance = this.calculateRelevance(template, query.keywords);
      if (relevance >= 0.7) {
        // 70% relevance threshold
        console.log(
          `[Template Matcher] ✅ Fuzzy match (${(relevance * 100).toFixed(0)}% relevance)`,
        );
        await this.recordMatch(template, cacheKey);
        return template;
      }
    }

    // Step 5: Tier 1.5 - Construct from granular templates
    const constructedMenu = await this.constructFromGranularTemplates(query);
    if (constructedMenu) {
      console.log('[Template Matcher] ✅ Constructed from granular templates');
      this.cache[cacheKey] = {
        data: constructedMenu,
        expires: Date.now() + 300 * 1000,
      };
      return constructedMenu;
    }

    // Step 6: Generic fallback (most popular for business type)
    const genericMatch = await this.templateRepo.findOne({
      where: {
        businessType: query.businessType as any,
        cuisineType: null as any, // Generic template without specific cuisine
        isActive: true,
      },
      order: {
        usageCount: 'DESC',
        confidenceScore: 'DESC',
      },
    });

    if (genericMatch) {
      console.log('[Template Matcher] ✅ Generic template match');
      await this.recordMatch(genericMatch, cacheKey);
      return genericMatch;
    }

    console.log(
      '[Template Matcher] ❌ No template match - will use AI generation',
    );
    return null;
  }

  /**
   * Construct a menu using granular templates (Tier 1.5)
   */
  private async constructFromGranularTemplates(
    query: TemplateMatchQuery,
  ): Promise<any | null> {
    try {
      // 1. Get categories
      const categories = await this.categoryTemplateRepo.find({
        where: [
          { businessType: query.businessType as any, isActive: true },
          { isUniversal: true, isActive: true },
        ],
        order: { displayOrder: 'ASC' },
        take: 5,
      });

      if (categories.length === 0) return null;

      const menuCategories: any[] = [];

      for (const cat of categories) {
        // 2. Get products for category
        const products = await this.productTemplateRepo.find({
          where: {
            categorySlug: cat.categorySlug,
            isActive: true,
            // Filter by dietary if possible
            ...(query.dietaryNeeds?.length
              ? { dietaryStatus: In(query.dietaryNeeds) }
              : {}),
          },
          order: { usageCount: 'DESC' },
          take: 6,
        });

        if (products.length > 0) {
          menuCategories.push({
            name: cat.categoryName,
            items: products.map((p) => ({
              name: p.productName,
              base_price: p.basePrice,
              description: p.description,
              dietary_status: p.dietaryStatus,
              modifiers: [
                ...(p.requiredModifiers || []),
                ...(p.optionalModifiers || []),
              ],
            })),
          });
        }
      }

      if (menuCategories.length === 0) return null;

      // 3. Get all relevant modifiers
      const modifierSlugs = new Set<string>();
      menuCategories.forEach((c) =>
        c.items.forEach((i) =>
          i.modifiers.forEach((m) => modifierSlugs.add(m)),
        ),
      );

      const modifiers = await this.modifierTemplateRepo.find({
        where: { modifierSlug: In(Array.from(modifierSlugs)), isActive: true },
      });

      return {
        templateName: `Granular Construction: ${query.businessType}`,
        templateData: {
          categories: menuCategories,
          modifiers: modifiers.map((m) => ({
            id: m.modifierSlug,
            name: m.modifierName,
            options: m.options,
          })),
        },
        id: 'granular-construction',
      };
    } catch (error) {
      console.warn(
        '[Template Matcher] Granular construction failed:',
        error.message,
      );
      return null;
    }
  }

  /**
   * Calculate relevance score between template and keywords
   */
  private calculateRelevance(
    template: MenuTemplate,
    keywords: string[],
  ): number {
    const templateText = JSON.stringify(template.templateData).toLowerCase();
    const templateName = template.templateName.toLowerCase();
    const templateCuisine = (template.cuisineType || '').toLowerCase();

    let matches = 0;
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (
        templateText.includes(kw) ||
        templateName.includes(kw) ||
        templateCuisine.includes(kw)
      ) {
        matches++;
      }
    }

    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  /**
   * Extract cuisine types from keywords
   */
  private extractCuisine(keywords: string[]): string[] {
    const cuisines = [
      'Italian',
      'Indian',
      'Mexican',
      'Chinese',
      'Thai',
      'Korean',
      'Japanese',
      'French',
      'American',
      'Mediterranean',
      'Middle Eastern',
      'Greek',
      'Spanish',
      'Vietnamese',
      'Turkish',
    ];

    return keywords.filter((kw) =>
      cuisines.some((cuisine) => cuisine.toLowerCase() === kw.toLowerCase()),
    );
  }

  /**
   * Record successful match (increment usage, cache result)
   */
  private async recordMatch(
    template: MenuTemplate,
    cacheKey: string,
  ): Promise<void> {
    // Increment usage count
    await this.templateRepo.increment({ id: template.id }, 'usageCount', 1);

    // Cache the result for 5 minutes
    this.cache[cacheKey] = {
      data: template,
      expires: Date.now() + 300 * 1000, // 5 minutes
    };
  }

  /**
   * Generate deterministic key for template matching
   */
  private generateMatchKey(query: TemplateMatchQuery): string {
    return [
      query.businessType,
      query.keywords.sort().join(','),
      (query.dietaryNeeds || []).sort().join(','),
    ].join('|');
  }
}
