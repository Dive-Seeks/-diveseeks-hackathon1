import { Module, forwardRef } from '@nestjs/common';
import { ReasoningService } from './reasoning.service';
import { ReasoningPromptBuilder } from './reasoning-prompt.builder';
import { CaiEvaluatorService } from './cai-evaluator.service';
import { AbigailModule } from '../abigail.module';

@Module({
  imports: [forwardRef(() => AbigailModule)],
  providers: [ReasoningService, ReasoningPromptBuilder, CaiEvaluatorService],
  exports: [ReasoningService],
})
export class ReasoningModule {}
