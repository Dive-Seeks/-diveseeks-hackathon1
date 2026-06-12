import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiIntegrationService } from './ai-integration.service';
import { AiIntegrationController } from './ai-integration.controller';
import { InternalLlmKeyController } from './internal-llm-key.controller';
import { InternalLlmKeyService } from './internal-llm-key.service';
import { AiConfiguration } from './entities/ai-configuration.entity';
import { AiUsage } from './entities/ai-usage.entity';
import { MenuImageExtraction } from './entities/menu-image-extraction.entity';
import { MenuTemplate } from '../menus/entities/menu-template.entity';
import { ProductTemplate } from '../menus/entities/product-template.entity';
import { ModifierTemplate } from '../menus/entities/modifier-template.entity';
import { ItemCategoryTemplate } from '../menus/entities/item-category-template.entity';
import { MenuGeneratorService } from './services/menu-generator.service';
import { MenuTemplateMatcherService } from './services/menu-template-matcher.service';
import { MenuCacheService } from './services/menu-cache.service';
import { AiKeyVaultService } from './ai-key-vault.service';
import { DeveloperProfile } from '../abigail/entities/developer-profile.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { CacheModule } from '../common/cache/cache.module';
import { ConfigModule } from '@nestjs/config';
import { UserLlmResolverService } from './user-llm-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConfiguration,
      AiUsage,
      MenuTemplate,
      ProductTemplate,
      ModifierTemplate,
      ItemCategoryTemplate,
      MenuImageExtraction,
      DeveloperProfile,
      TaskSession,
    ]),
    CacheModule,
    ConfigModule,
  ],
  controllers: [AiIntegrationController, InternalLlmKeyController],
  providers: [
    AiIntegrationService,
    MenuGeneratorService,
    MenuTemplateMatcherService,
    MenuCacheService,
    AiKeyVaultService,
    InternalLlmKeyService,
    UserLlmResolverService,
  ],
  exports: [
    AiIntegrationService,
    MenuGeneratorService,
    MenuTemplateMatcherService,
    MenuCacheService,
    AiKeyVaultService,
    InternalLlmKeyService,
    UserLlmResolverService,
  ],
})
export class AiIntegrationModule {}
