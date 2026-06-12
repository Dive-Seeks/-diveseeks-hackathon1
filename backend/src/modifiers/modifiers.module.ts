import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { AiSuggestionsService } from './services/ai-suggestions.service';
import { Modifier } from './entities/modifier.entity';
import { ModifierOption } from './entities/modifier-option.entity';
import { ModifierOptionPricing } from './entities/modifier-option-pricing.entity';
import { MenuItemModifier } from './entities/menu-item-modifier.entity';
import { ModifierTemplate } from '../menus/entities/modifier-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Modifier,
      ModifierOption,
      ModifierOptionPricing,
      MenuItemModifier,
      ModifierTemplate,
    ]),
  ],
  controllers: [ModifiersController],
  providers: [ModifiersService, AiSuggestionsService],
  exports: [ModifiersService, AiSuggestionsService],
})
export class ModifiersModule {}
