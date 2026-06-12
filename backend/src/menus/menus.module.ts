import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { TemplateSeederService } from './services/template-seeder.service';
import { Menu } from './entities/menu.entity';
import { SiteMenu } from './entities/site-menu.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuAvailability } from './entities/menu-availability.entity';
import { MenuTemplate } from './entities/menu-template.entity';
import { ProductTemplate } from './entities/product-template.entity';
import { ModifierTemplate } from './entities/modifier-template.entity';
import { ItemCategoryTemplate } from './entities/item-category-template.entity';
import { Product } from '../products/entities/product.entity';
import { Site } from '../sites/entities/site.entity';
import { Pricing } from '../pricing/entities/pricing.entity';
import { Store } from '../setup-business/entities/store.entity';
import { Modifier } from '../modifiers/entities/modifier.entity';
import { ModifierOption } from '../modifiers/entities/modifier-option.entity';
import { MenuItemModifier } from '../modifiers/entities/menu-item-modifier.entity';
import { ModifierOptionPricing } from '../modifiers/entities/modifier-option-pricing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Menu,
      SiteMenu,
      MenuCategory,
      MenuItem,
      MenuAvailability,
      MenuTemplate,
      ProductTemplate,
      ModifierTemplate,
      ItemCategoryTemplate,
      Product,
      Site,
      Pricing,
      Store,
      Modifier,
      ModifierOption,
      MenuItemModifier,
      ModifierOptionPricing,
    ]),
  ],
  controllers: [MenusController],
  providers: [MenusService, TemplateSeederService],
  exports: [MenusService, TemplateSeederService],
})
export class MenusModule {}
