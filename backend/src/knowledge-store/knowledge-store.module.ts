import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeStoreService } from './knowledge-store.service';
import { GlobalKnowledge } from './entities/global-knowledge.entity';
import { TenantKnowledge } from './entities/tenant-knowledge.entity';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { MenuEmbeddingsModule } from '../menu-embeddings/menu-embeddings.module';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeSynthesisService } from './knowledge-synthesis.service';
import { KnowledgeSynthesisProcessor } from './knowledge-synthesis.processor';
import { GatewaysModule } from '../gateways/gateways.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalKnowledge, TenantKnowledge]),
    BullModule.registerQueue({ name: 'knowledge-synthesis' }),
    forwardRef(() => TokenizerModule),
    MenuEmbeddingsModule,
    GatewaysModule,
    CommonModule,
  ],
  providers: [
    KnowledgeStoreService,
    KnowledgeSynthesisService,
    KnowledgeSynthesisProcessor,
  ],
  exports: [KnowledgeStoreService, TypeOrmModule],
})
export class KnowledgeStoreModule {}
