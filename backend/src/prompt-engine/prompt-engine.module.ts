import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoordinatorModule } from '../coordinator/coordinator.module';

import { PromptTemplate } from './entities/prompt-template.entity';
import { PromptExecution } from './entities/prompt-execution.entity';
import { Prompt } from './entities/prompt.entity';
import { PromptVersion } from './entities/prompt-version.entity';
import { PromptPartial } from './entities/prompt-partial.entity';
import { PromptEvaluation } from './entities/prompt-evaluation.entity';

import { PromptEngineService } from './services/prompt-engine.service';
import { PromptCrudService } from './services/prompt-crud.service';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptCompilerService } from './services/prompt-compiler.service';
import { PromptResolverService } from './services/prompt-resolver.service';
import { TokenizerModule } from '../tokenizer/tokenizer.module';

import { PromptEngineController } from './prompt-engine.controller';
import { PromptPartialsController } from './prompt-engine.controller.partials';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromptTemplate,
      PromptExecution,
      Prompt,
      PromptVersion,
      PromptPartial,
      PromptEvaluation,
    ]),
    TokenizerModule,
    forwardRef(() => CoordinatorModule),
  ],

  providers: [
    PromptEngineService,
    PromptCrudService,
    PromptVersionService,
    PromptCompilerService,
    PromptResolverService,
  ],
  controllers: [PromptEngineController, PromptPartialsController],
  exports: [
    PromptEngineService,
    PromptResolverService,
    PromptCompilerService,
    PromptVersionService,
    PromptCrudService,
  ],
})
export class PromptEngineModule {}
