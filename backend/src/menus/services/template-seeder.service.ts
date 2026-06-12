import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModifierTemplate } from '../entities/modifier-template.entity';

/**
 * Template Seeder Service
 *
 * Seeds the database with common modifier templates for restaurants.
 * These templates are used by the AI to suggest modifier bundles.
 */
@Injectable()
export class TemplateSeederService {
  private readonly logger = new Logger(TemplateSeederService.name);

  constructor(
    @InjectRepository(ModifierTemplate)
    private readonly templateRepository: Repository<ModifierTemplate>,
  ) {}

  /**
   * Seed all modifier templates
   */
  async seedTemplates(): Promise<void> {
    this.logger.log('Starting modifier template seeding...');

    const templates = [
      ...this.getPizzaTemplates(),
      ...this.getCoffeeTemplates(),
      ...this.getSandwichTemplates(),
      ...this.getUniversalTemplates(),
    ];

    for (const template of templates) {
      const existing = await this.templateRepository.findOne({
        where: { modifierSlug: template.modifierSlug },
      });

      if (!existing) {
        await this.templateRepository.save(template);
        this.logger.log(`✅ Created template: ${template.modifierName}`);
      } else {
        this.logger.log(`⏭️  Skipped existing: ${template.modifierName}`);
      }
    }

    this.logger.log('Template seeding complete!');
  }

  /**
   * Pizza modifier templates
   */
  private getPizzaTemplates(): Partial<ModifierTemplate>[] {
    return [
      // Pizza Size
      {
        modifierSlug: 'mod_pizza_size',
        modifierName: 'Size',
        businessType: 'RESTAURANT',
        categorySlug: 'pizza',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        description: 'Choose your pizza size',
        icon: '📏',
        tags: ['popular', 'required', 'sizing'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Small (9")',
            priceModifier: 0,
            isDefault: true,
            calories: 800,
            description: 'Perfect for 1-2 people',
          },
          {
            name: 'Medium (12")',
            priceModifier: 200, // +£2.00
            calories: 1200,
            description: 'Great for 2-3 people',
          },
          {
            name: 'Large (15")',
            priceModifier: 400, // +£4.00
            calories: 1600,
            description: 'Ideal for 3-4 people',
          },
          {
            name: 'Extra Large (18")',
            priceModifier: 600, // +£6.00
            calories: 2000,
            description: 'Perfect for parties (4-6 people)',
          },
        ],
      },

      // Pizza Crust Type
      {
        modifierSlug: 'mod_pizza_crust',
        modifierName: 'Crust Type',
        businessType: 'RESTAURANT',
        categorySlug: 'pizza',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 2,
        description: 'Select your preferred crust',
        icon: '🍕',
        tags: ['popular', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Hand-Tossed',
            priceModifier: 0,
            isDefault: true,
            calories: 200,
            description: 'Classic hand-tossed crust',
          },
          {
            name: 'Thin & Crispy',
            priceModifier: 0,
            calories: 150,
            description: 'Light and crispy',
          },
          {
            name: 'Deep Dish',
            priceModifier: 150, // +£1.50
            calories: 350,
            description: 'Thick and fluffy',
          },
          {
            name: 'Gluten-Free',
            priceModifier: 250, // +£2.50
            calories: 180,
            allergens: [],
            description: 'Suitable for gluten-sensitive customers',
          },
        ],
      },

      // Pizza Extra Toppings
      {
        modifierSlug: 'mod_pizza_toppings',
        modifierName: 'Extra Toppings',
        businessType: 'RESTAURANT',
        categorySlug: 'pizza',
        isUniversal: false,
        modifierType: 'multi_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: null, // Unlimited
        displayOrder: 3,
        description: 'Add extra toppings to your pizza',
        icon: '🧀',
        tags: ['popular', 'premium', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Extra Cheese',
            priceModifier: 100,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 120,
          },
          {
            name: 'Pepperoni',
            priceModifier: 150,
            dietaryStatus: 'non_halal',
            containsPork: true,
            calories: 140,
          },
          {
            name: 'Mushrooms',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 15,
          },
          {
            name: 'Black Olives',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 25,
          },
          {
            name: 'Green Peppers',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 10,
          },
          {
            name: 'Red Onions',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 12,
          },
          {
            name: 'Italian Sausage',
            priceModifier: 150,
            dietaryStatus: 'non_halal',
            containsPork: true,
            calories: 160,
          },
          {
            name: 'Grilled Chicken',
            priceModifier: 150,
            dietaryStatus: 'halal',
            calories: 110,
          },
          {
            name: 'Bacon',
            priceModifier: 150,
            dietaryStatus: 'non_halal',
            containsPork: true,
            calories: 130,
          },
          {
            name: 'Pineapple',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 20,
          },
          {
            name: 'Jalapeños',
            priceModifier: 50,
            dietaryStatus: 'vegan',
            calories: 5,
          },
          {
            name: 'Spinach',
            priceModifier: 80,
            dietaryStatus: 'vegan',
            calories: 7,
          },
        ],
        dietaryReplacements: [
          {
            trigger: 'halal',
            originalOption: 'Pepperoni',
            replacementOption: 'Grilled Chicken',
            autoApply: false,
          },
          {
            trigger: 'halal',
            originalOption: 'Italian Sausage',
            replacementOption: 'Grilled Chicken',
            autoApply: false,
          },
          {
            trigger: 'halal',
            originalOption: 'Bacon',
            replacementOption: 'Grilled Chicken',
            autoApply: false,
          },
          {
            trigger: 'vegetarian',
            originalOption: 'Pepperoni',
            replacementOption: 'Mushrooms',
            autoApply: false,
          },
        ],
      },

      // Cheese Options
      {
        modifierSlug: 'mod_pizza_cheese',
        modifierName: 'Cheese Options',
        businessType: 'RESTAURANT',
        categorySlug: 'pizza',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 4,
        description: 'Customize your cheese',
        icon: '🧀',
        tags: ['dietary', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Regular Cheese',
            priceModifier: 0,
            isDefault: true,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 200,
          },
          {
            name: 'Extra Cheese',
            priceModifier: 150,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 300,
          },
          {
            name: 'Light Cheese',
            priceModifier: 0,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 100,
          },
          {
            name: 'Vegan Cheese',
            priceModifier: 200,
            dietaryStatus: 'vegan',
            allergens: [],
            calories: 180,
          },
          {
            name: 'No Cheese',
            priceModifier: -50,
            dietaryStatus: 'vegan',
            allergens: [],
            calories: 0,
          },
        ],
      },
    ];
  }

  /**
   * Coffee modifier templates
   */
  private getCoffeeTemplates(): Partial<ModifierTemplate>[] {
    return [
      // Coffee Size
      {
        modifierSlug: 'mod_coffee_size',
        modifierName: 'Size',
        businessType: 'CAFE',
        categorySlug: 'coffee',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        description: 'Choose your coffee size',
        icon: '☕',
        tags: ['popular', 'required', 'sizing'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Small (8 oz)',
            priceModifier: 0,
            isDefault: false,
            calories: 80,
          },
          {
            name: 'Medium (12 oz)',
            priceModifier: 50, // +£0.50
            isDefault: true,
            calories: 120,
          },
          {
            name: 'Large (16 oz)',
            priceModifier: 100, // +£1.00
            calories: 160,
          },
          {
            name: 'Extra Large (20 oz)',
            priceModifier: 150, // +£1.50
            calories: 200,
          },
        ],
      },

      // Milk Choice
      {
        modifierSlug: 'mod_coffee_milk',
        modifierName: 'Milk Choice',
        businessType: 'CAFE',
        categorySlug: 'coffee',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 2,
        description: 'Select your milk preference',
        icon: '🥛',
        tags: ['popular', 'dietary', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Whole Milk',
            priceModifier: 0,
            isDefault: true,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 150,
          },
          {
            name: 'Skim Milk',
            priceModifier: 0,
            dietaryStatus: 'vegetarian',
            allergens: ['dairy'],
            calories: 80,
          },
          {
            name: 'Oat Milk',
            priceModifier: 50, // +£0.50
            dietaryStatus: 'vegan',
            allergens: [],
            calories: 120,
          },
          {
            name: 'Almond Milk',
            priceModifier: 50,
            dietaryStatus: 'vegan',
            allergens: ['nuts'],
            calories: 40,
          },
          {
            name: 'Soy Milk',
            priceModifier: 50,
            dietaryStatus: 'vegan',
            allergens: ['soy'],
            calories: 80,
          },
          {
            name: 'Coconut Milk',
            priceModifier: 50,
            dietaryStatus: 'vegan',
            allergens: [],
            calories: 60,
          },
        ],
        dietaryReplacements: [
          {
            trigger: 'vegan',
            originalOption: 'Whole Milk',
            replacementOption: 'Oat Milk',
            autoApply: false,
          },
        ],
      },

      // Espresso Shots
      {
        modifierSlug: 'mod_coffee_shots',
        modifierName: 'Espresso Shots',
        businessType: 'CAFE',
        categorySlug: 'coffee',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 3,
        description: 'Add extra espresso shots',
        icon: '☕',
        tags: ['popular', 'premium'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Single Shot',
            priceModifier: 0,
            isDefault: true,
            calories: 5,
          },
          {
            name: 'Double Shot',
            priceModifier: 60, // +£0.60
            calories: 10,
          },
          {
            name: 'Triple Shot',
            priceModifier: 120, // +£1.20
            calories: 15,
          },
          {
            name: 'Decaf',
            priceModifier: 0,
            calories: 5,
          },
        ],
      },

      // Flavor Syrups
      {
        modifierSlug: 'mod_coffee_syrup',
        modifierName: 'Flavor Syrup',
        businessType: 'CAFE',
        categorySlug: 'coffee',
        isUniversal: false,
        modifierType: 'multi_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 3,
        displayOrder: 4,
        description: 'Add flavor syrups (max 3)',
        icon: '🍯',
        tags: ['premium', 'sweet', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          { name: 'Vanilla', priceModifier: 50, calories: 80 },
          { name: 'Caramel', priceModifier: 50, calories: 80 },
          {
            name: 'Hazelnut',
            priceModifier: 50,
            calories: 80,
            allergens: ['nuts'],
          },
          { name: 'Mocha', priceModifier: 50, calories: 90 },
          { name: 'Peppermint', priceModifier: 50, calories: 70 },
          { name: 'Cinnamon', priceModifier: 50, calories: 60 },
          { name: 'Sugar-Free Vanilla', priceModifier: 60, calories: 10 },
          { name: 'Sugar-Free Caramel', priceModifier: 60, calories: 10 },
        ],
      },
    ];
  }

  /**
   * Sandwich modifier templates
   */
  private getSandwichTemplates(): Partial<ModifierTemplate>[] {
    return [
      // Bread Type
      {
        modifierSlug: 'mod_sandwich_bread',
        modifierName: 'Bread Type',
        businessType: 'RESTAURANT',
        categorySlug: 'sandwich',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        description: 'Choose your bread',
        icon: '🍞',
        tags: ['required', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'White Bread',
            priceModifier: 0,
            isDefault: true,
            calories: 150,
          },
          {
            name: 'Whole Wheat',
            priceModifier: 0,
            calories: 140,
          },
          {
            name: 'Sourdough',
            priceModifier: 50,
            calories: 160,
          },
          {
            name: 'Ciabatta',
            priceModifier: 50,
            calories: 180,
          },
          {
            name: 'Gluten-Free',
            priceModifier: 150,
            allergens: [],
            calories: 130,
          },
          {
            name: 'Wrap',
            priceModifier: 0,
            calories: 120,
          },
        ],
      },

      // Protein Choice
      {
        modifierSlug: 'mod_sandwich_protein',
        modifierName: 'Protein',
        businessType: 'RESTAURANT',
        categorySlug: 'sandwich',
        isUniversal: false,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 2,
        description: 'Add protein to your sandwich',
        icon: '🍖',
        tags: ['popular', 'premium'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          {
            name: 'Grilled Chicken',
            priceModifier: 200,
            dietaryStatus: 'halal',
            calories: 150,
          },
          {
            name: 'Turkey',
            priceModifier: 200,
            dietaryStatus: 'halal',
            calories: 120,
          },
          {
            name: 'Ham',
            priceModifier: 200,
            dietaryStatus: 'non_halal',
            containsPork: true,
            calories: 140,
          },
          {
            name: 'Bacon',
            priceModifier: 200,
            dietaryStatus: 'non_halal',
            containsPork: true,
            calories: 180,
          },
          {
            name: 'Roast Beef',
            priceModifier: 250,
            dietaryStatus: 'halal',
            calories: 160,
          },
          {
            name: 'Falafel',
            priceModifier: 150,
            dietaryStatus: 'vegan',
            calories: 100,
          },
        ],
        dietaryReplacements: [
          {
            trigger: 'halal',
            originalOption: 'Ham',
            replacementOption: 'Turkey',
            autoApply: false,
          },
          {
            trigger: 'halal',
            originalOption: 'Bacon',
            replacementOption: 'Grilled Chicken',
            autoApply: false,
          },
          {
            trigger: 'vegan',
            originalOption: 'Grilled Chicken',
            replacementOption: 'Falafel',
            autoApply: false,
          },
        ],
      },
    ];
  }

  /**
   * Universal modifier templates (apply to any business type)
   */
  private getUniversalTemplates(): Partial<ModifierTemplate>[] {
    return [
      // Spice Level
      {
        modifierSlug: 'mod_universal_spice',
        modifierName: 'Spice Level',
        businessType: 'UNIVERSAL',
        categorySlug: null,
        isUniversal: true,
        modifierType: 'single_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 10,
        description: 'How spicy would you like it?',
        icon: '🌶️',
        tags: ['popular', 'customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          { name: 'Mild', priceModifier: 0, isDefault: true },
          { name: 'Medium', priceModifier: 0 },
          { name: 'Hot', priceModifier: 0 },
          { name: 'Extra Hot', priceModifier: 0 },
          { name: 'No Spice', priceModifier: 0 },
        ],
      },

      // Special Instructions
      {
        modifierSlug: 'mod_universal_instructions',
        modifierName: 'Special Instructions',
        businessType: 'UNIVERSAL',
        categorySlug: null,
        isUniversal: true,
        modifierType: 'text_input',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 99,
        description: 'Any special requests or dietary requirements?',
        icon: '📝',
        tags: ['customization'],
        confidenceScore: 1.0,
        isActive: true,
        options: [],
      },

      // Dietary Preferences
      {
        modifierSlug: 'mod_universal_dietary',
        modifierName: 'Dietary Preferences',
        businessType: 'UNIVERSAL',
        categorySlug: null,
        isUniversal: true,
        modifierType: 'multi_select',
        isRequired: false,
        minSelections: 0,
        maxSelections: null,
        displayOrder: 5,
        description: 'Select your dietary requirements',
        icon: '🥗',
        tags: ['dietary', 'important'],
        confidenceScore: 1.0,
        isActive: true,
        options: [
          { name: 'Halal', priceModifier: 0, dietaryStatus: 'halal' },
          { name: 'Vegetarian', priceModifier: 0, dietaryStatus: 'vegetarian' },
          { name: 'Vegan', priceModifier: 0, dietaryStatus: 'vegan' },
          { name: 'Gluten-Free', priceModifier: 0 },
          { name: 'Nut Allergy', priceModifier: 0 },
          { name: 'Dairy-Free', priceModifier: 0 },
        ],
      },
    ];
  }
}
