import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataEngineParametricBridge } from '../memory/data-engine-parametric.bridge';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DATA_ENGINE_QUEUE } from './data-engine.queue';
import { DataRepo } from './entities/data-repo.entity';
import { SourceDocument } from './entities/source-document.entity';
import { WikiPage } from './entities/wiki-page.entity';
import { Extraction } from './entities/extraction.entity';
import { LintRun } from './entities/lint-run.entity';
import { DataEngineController } from './data-engine.controller';
import { DataEngineService } from './data-engine.service';
import { DataEngineProcessor } from './data-engine.processor';
import { DocumentParserService } from './pipeline/document-parser.service';
import { AutodataAnalyzerService } from './pipeline/autodata-analyzer.service';
import { ContradictionDetectorService } from './pipeline/contradiction-detector.service';
import { WikiCompilerService } from './pipeline/wiki-compiler.service';
import { GraphBuilderService } from './pipeline/graph-builder.service';
import { WikiLintService } from './pipeline/wiki-lint.service';
import { QualityVerifierService } from './pipeline/quality-verifier.service';
import { DataRepoSearchService } from './retrieval/data-repo-search.service';
import { DataEngineMcpService } from './mcp/data-engine-mcp.service';
import { MemoryModule } from '../memory/memory.module';
import { HermesModule } from '../hermes/hermes.module';
import { SpecKitFolderService } from './spec-kit/spec-kit-folder.service';
import { SpecKitLifecycleService } from './spec-kit/spec-kit-lifecycle.service';
import { SpecKitConstitutionGuard } from './spec-kit/spec-kit-constitution.guard';
import { SpecKitTaskMapper } from './spec-kit/spec-kit-task-mapper.service';
import { SpecKitAuditBridgeService } from './spec-kit/spec-kit-audit-bridge.service';

import { TCETask } from '../tce/entities/tce-task.entity';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';

import { SpecKitEntryService } from './spec-kit/spec-kit-entry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataRepo,
      SourceDocument,
      WikiPage,
      Extraction,
      LintRun,
      TCETask,
      DiveSeeksProject,
    ]),
    BullModule.registerQueue({ name: DATA_ENGINE_QUEUE }),
    BullModule.registerQueue({ name: 'brain-memory' }),
    BullModule.registerQueue({ name: 'web-research-global' }),
    MulterModule.register({ dest: './uploads/data-engine' }),
    MemoryModule,
    HermesModule,
  ],
  controllers: [DataEngineController],
  providers: [
    DataEngineService,
    DataEngineProcessor,
    DocumentParserService,
    AutodataAnalyzerService,
    ContradictionDetectorService,
    WikiCompilerService,
    GraphBuilderService,
    WikiLintService,
    QualityVerifierService,
    DataRepoSearchService,
    DataEngineMcpService,
    DataEngineParametricBridge,
    SpecKitFolderService,
    SpecKitLifecycleService,
    SpecKitConstitutionGuard,
    SpecKitTaskMapper,
    SpecKitAuditBridgeService,
    SpecKitEntryService,
  ],
  exports: [
    DataEngineMcpService,
    DataEngineParametricBridge,
    SpecKitEntryService,
  ],
})
export class DataEngineModule implements OnModuleInit {
  constructor(
    @InjectQueue(DATA_ENGINE_QUEUE) private readonly dataEngineQueue: Queue,
  ) {}

  async onModuleInit() {
    // 2 AM daily — lint all active repos for orphans, stale claims, knowledge gaps
    await this.dataEngineQueue.add(
      'lint-all-repos',
      {},
      { repeat: { pattern: '0 2 * * *' }, removeOnComplete: true },
    );
  }
}
