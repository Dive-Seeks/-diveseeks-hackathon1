import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeepReasoningService } from './deep-reasoning.service';
import { DeepReasoningController } from './deep-reasoning.controller';
import { KnowledgeStoreModule } from '../../knowledge-store/knowledge-store.module';
import { WebResearchModule } from '../../web-research/web-research.module';
import { ResearchJob } from '../../web-research/entities/research-job.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchJob]),
    BullModule.registerQueue(
      { name: 'web-research-global' },
      { name: 'knowledge-synthesis' },
    ),
    forwardRef(() => KnowledgeStoreModule),
    forwardRef(() => WebResearchModule),
    CommonModule,
  ],
  providers: [DeepReasoningService],
  controllers: [DeepReasoningController],
  exports: [DeepReasoningService],
})
export class DeepReasoningModule {}
