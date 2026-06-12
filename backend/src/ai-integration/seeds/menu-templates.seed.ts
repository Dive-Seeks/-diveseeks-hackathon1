import { Repository } from 'typeorm';
import { MenuTemplate } from '../../menus/entities/menu-template.entity';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Seed menu templates from Universal-Menu.json
 * Run this after initial migration to populate DB with curated templates
 */
export async function seedMenuTemplates(
  templateRepo: Repository<MenuTemplate>,
): Promise<void> {
  console.log('🌱 Seeding menu templates from Universal-Menu.json...');

  // Load Universal-Menu.json
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

  if (!fs.existsSync(universalMenuPath)) {
    console.warn('⚠️  Universal-Menu.json not found, skipping seed');
    return;
  }

  const universalMenu = JSON.parse(fs.readFileSync(universalMenuPath, 'utf-8'));

  // ========== TEMPLATE 1: Halal Pizza Restaurant ==========
  const halalPizzaTemplate = await templateRepo.save({
    businessType: 'RESTAURANT',
    cuisineType: 'Italian',
    dietaryCategory: 'Halal',
    templateName: 'Halal Pizza Restaurant Starter',
    templateData: {
      categories: [
        {
          name: 'Pizzas',
          items: [
            {
              name: 'Halal Pepperoni Feast',
              base_price: 1399,
              description: '100% Halal Beef Pepperoni and Mozzarella',
              dietary_status: 'halal',
              modifiers: ['mod_pizza_size', 'mod_pizza_crust'],
            },
            {
              name: 'Grilled Chicken Supreme',
              base_price: 1499,
              description: 'Halal grilled chicken, peppers, onions, mushrooms',
              dietary_status: 'halal',
              modifiers: ['mod_pizza_size', 'mod_pizza_crust'],
            },
            {
              name: 'Vegetarian Delight',
              base_price: 1299,
              description: 'Fresh veggies, olives, tomatoes, mozzarella',
              dietary_status: 'vegetarian',
              modifiers: ['mod_pizza_size', 'mod_pizza_crust'],
            },
          ],
        },
        {
          name: 'Sides',
          items: [
            {
              name: 'Garlic Breadsticks',
              base_price: 599,
              description: 'Freshly baked with garlic butter',
              dietary_status: 'vegetarian',
            },
            {
              name: 'Halal Chicken Wings',
              base_price: 899,
              description: '10 pieces, choice of sauce',
              dietary_status: 'halal',
              modifiers: ['mod_wing_sauce'],
            },
          ],
        },
        {
          name: 'Drinks',
          items: [
            {
              name: 'Soft Drink',
              base_price: 299,
              description: 'Coke, Sprite, Fanta',
              dietary_status: 'halal',
              modifiers: ['mod_drink_size'],
            },
          ],
        },
      ],
      modifiers: [
        {
          id: 'mod_pizza_size',
          name: 'Size',
          options: [
            { name: 'Small (10")', price_delta: 0 },
            { name: 'Medium (12")', price_delta: 300 },
            { name: 'Large (14")', price_delta: 500 },
            { name: 'X-Large (16")', price_delta: 700 },
          ],
        },
        {
          id: 'mod_pizza_crust',
          name: 'Crust Style',
          options: universalMenu.modifier_blueprints.pizza_logic.crusts.options,
        },
        {
          id: 'mod_wing_sauce',
          name: 'Wing Sauce',
          options: [
            { name: 'Buffalo', price_delta: 0 },
            { name: 'BBQ', price_delta: 0 },
            { name: 'Honey Garlic', price_delta: 0 },
            { name: 'Plain', price_delta: 0 },
          ],
        },
        {
          id: 'mod_drink_size',
          name: 'Size',
          options: [
            { name: 'Small', price_delta: 0 },
            { name: 'Medium', price_delta: 50 },
            { name: 'Large', price_delta: 100 },
          ],
        },
      ],
    },
    usageCount: 0,
    confidenceScore: 1.0, // Human-curated = highest confidence
    isActive: true,
  });

  console.log('✅ Created: Halal Pizza Restaurant Starter');

  // ========== TEMPLATE 2: Standard Pizza Restaurant (with pork) ==========
  await templateRepo.save({
    businessType: 'RESTAURANT',
    cuisineType: 'Italian',
    dietaryCategory: null,
    templateName: 'Classic Pizza Restaurant',
    templateData: {
      categories: [
        {
          name: 'Pizzas',
          items: universalMenu.item_templates.pizza_sector,
        },
      ],
      modifiers: Object.values(
        universalMenu.modifier_blueprints.pizza_logic,
      ).map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        options: mod.options,
      })),
    },
    usageCount: 0,
    confidenceScore: 1.0,
    isActive: true,
  });

  console.log('✅ Created: Classic Pizza Restaurant');

  // ========== TEMPLATE 3: Sandwich Shop (Halal) ==========
  await templateRepo.save({
    businessType: 'RESTAURANT',
    cuisineType: 'American',
    dietaryCategory: 'Halal',
    templateName: 'Halal Sandwich Shop',
    templateData: {
      categories: [
        {
          name: 'Sandwiches',
          items: [
            {
              name: 'Turkey & Swiss Sub',
              base_price: 750,
              description: 'Fresh turkey breast, Swiss cheese, lettuce, tomato',
              dietary_status: 'halal',
              modifiers: ['mod_sub_bread', 'mod_sub_size'],
            },
            {
              name: 'Roast Beef Sub',
              base_price: 850,
              description: 'Premium roast beef, cheddar, horseradish mayo',
              dietary_status: 'halal',
              modifiers: ['mod_sub_bread', 'mod_sub_size'],
            },
            {
              name: 'Veggie Delight',
              base_price: 650,
              description: 'Fresh vegetables, hummus, avocado',
              dietary_status: 'vegan',
              modifiers: ['mod_sub_bread', 'mod_sub_size'],
            },
          ],
        },
      ],
      modifiers: [
        {
          id: 'mod_sub_bread',
          name: 'Bread Choice',
          options: [
            { name: 'White', price_delta: 0 },
            { name: 'Wheat', price_delta: 0 },
            { name: 'Wrap', price_delta: 50 },
          ],
        },
        {
          id: 'mod_sub_size',
          name: 'Size',
          options: [
            { name: '6 inch', price_delta: 0 },
            { name: '12 inch', price_delta: 350 },
          ],
        },
      ],
    },
    usageCount: 0,
    confidenceScore: 1.0,
    isActive: true,
  });

  console.log('✅ Created: Halal Sandwich Shop');

  // ========== TEMPLATE 4: Cafe ==========
  await templateRepo.save({
    businessType: 'CAFE',
    cuisineType: null,
    dietaryCategory: 'Vegetarian',
    templateName: 'Modern Cafe Starter',
    templateData: {
      categories: [
        {
          name: 'Coffee & Espresso',
          items: [
            {
              name: 'Latte',
              base_price: 450,
              description: 'Espresso with steamed milk',
              dietary_status: 'vegetarian',
              modifiers: ['mod_coffee_size', 'mod_milk_type'],
            },
            {
              name: 'Cappuccino',
              base_price: 450,
              description: 'Espresso with foamed milk',
              dietary_status: 'vegetarian',
              modifiers: ['mod_coffee_size', 'mod_milk_type'],
            },
            {
              name: 'Americano',
              base_price: 350,
              description: 'Espresso with hot water',
              dietary_status: 'vegan',
              modifiers: ['mod_coffee_size'],
            },
          ],
        },
        {
          name: 'Pastries',
          items: [
            {
              name: 'Croissant',
              base_price: 350,
              description: 'Buttery, flaky pastry',
              dietary_status: 'vegetarian',
            },
            {
              name: 'Blueberry Muffin',
              base_price: 375,
              description: 'Fresh-baked with real blueberries',
              dietary_status: 'vegetarian',
            },
          ],
        },
      ],
      modifiers: [
        {
          id: 'mod_coffee_size',
          name: 'Size',
          options: [
            { name: 'Small (8oz)', price_delta: 0 },
            { name: 'Medium (12oz)', price_delta: 75 },
            { name: 'Large (16oz)', price_delta: 125 },
          ],
        },
        {
          id: 'mod_milk_type',
          name: 'Milk Choice',
          options: [
            { name: 'Whole Milk', price_delta: 0 },
            { name: 'Oat Milk', price_delta: 75 },
            { name: 'Almond Milk', price_delta: 75 },
            { name: 'Soy Milk', price_delta: 50 },
          ],
        },
      ],
    },
    usageCount: 0,
    confidenceScore: 1.0,
    isActive: true,
  });

  console.log('✅ Created: Modern Cafe Starter');

  // ========== TEMPLATE 5: Bar/Pub ==========
  await templateRepo.save({
    businessType: 'BAR',
    cuisineType: null,
    dietaryCategory: null,
    templateName: 'Bar & Pub Starter',
    templateData: {
      categories: [
        {
          name: 'Cocktails',
          items: universalMenu.item_templates.bar_sector.filter((item: any) =>
            item.categories?.includes('Cocktails'),
          ),
        },
        {
          name: 'Mocktails',
          items: universalMenu.item_templates.bar_sector.filter((item: any) =>
            item.categories?.includes('Mocktails'),
          ),
        },
      ],
      modifiers: Object.values(universalMenu.modifier_blueprints.bar_logic).map(
        (mod: any) => ({
          id: mod.id,
          name: mod.name,
          options: mod.options,
        }),
      ),
    },
    usageCount: 0,
    confidenceScore: 1.0,
    isActive: true,
  });

  console.log('✅ Created: Bar & Pub Starter');

  // ========== TEMPLATE 6: Generic Restaurant ==========
  await templateRepo.save({
    businessType: 'RESTAURANT',
    cuisineType: null,
    dietaryCategory: null,
    templateName: 'Generic Restaurant Template',
    templateData: {
      categories: [
        {
          name: 'Appetizers',
          items: [
            {
              name: 'House Salad',
              base_price: 699,
              description: 'Mixed greens, tomatoes, cucumbers',
              dietary_status: 'vegetarian',
            },
            {
              name: 'Soup of the Day',
              base_price: 599,
              description: "Ask your server for today's selection",
            },
          ],
        },
        {
          name: 'Main Courses',
          items: [
            {
              name: 'Grilled Chicken',
              base_price: 1499,
              description: 'With seasonal vegetables and rice',
            },
            {
              name: 'Pasta Primavera',
              base_price: 1299,
              description: 'Fresh pasta with seasonal vegetables',
              dietary_status: 'vegetarian',
            },
          ],
        },
        {
          name: 'Desserts',
          items: [
            {
              name: 'Chocolate Cake',
              base_price: 699,
              description: 'Rich chocolate layer cake',
            },
            {
              name: 'Ice Cream',
              base_price: 499,
              description: 'Vanilla, chocolate, or strawberry',
            },
          ],
        },
      ],
      modifiers: [],
    },
    usageCount: 0,
    confidenceScore: 1.0,
    isActive: true,
  });

  console.log('✅ Created: Generic Restaurant Template');

  console.log(`\n🎉 Successfully seeded ${6} menu templates!`);
}
