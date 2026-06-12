import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { DATA_ENGINE_QUEUE, DataEngineJobs } from './data-engine.queue';
import { SourceDocument } from './entities/source-document.entity';
import { DataRepo } from './entities/data-repo.entity';
import { DocumentParserService } from './pipeline/document-parser.service';
import { AutodataAnalyzerService } from './pipeline/autodata-analyzer.service';
import { ContradictionDetectorService } from './pipeline/contradiction-detector.service';
import { WikiCompilerService } from './pipeline/wiki-compiler.service';
import { GraphBuilderService } from './pipeline/graph-builder.service';
import { WikiLintService } from './pipeline/wiki-lint.service';
import { DataEngineParametricBridge } from '../memory/data-engine-parametric.bridge';

@Processor(DATA_ENGINE_QUEUE)
export class DataEngineProcessor extends WorkerHost {
  private readonly logger = new Logger(DataEngineProcessor.name);

  constructor(
    @InjectRepository(SourceDocument)
    private readonly sourceRepo: Repository<SourceDocument>,
    @InjectRepository(DataRepo) private readonly repoRepo: Repository<DataRepo>,
    private readonly parser: DocumentParserService,
    private readonly analyzer: AutodataAnalyzerService,
    private readonly contradictionDetector: ContradictionDetectorService,
    private readonly wikiCompiler: WikiCompilerService,
    private readonly graphBuilder: GraphBuilderService,
    private readonly wikiLint: WikiLintService,
    private readonly bridge: DataEngineParametricBridge,
    @InjectQueue(DATA_ENGINE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === DataEngineJobs.PROCESS_DOCUMENT) {
      await this.processDocument(job.data);
      return;
    }

    if (job.name === 'lint-all-repos') {
      const activeRepos = await this.repoRepo.find({
        where: { status: 'active' },
      });
      const lintJobs = activeRepos.map((r) => ({
        name: 'lint-repo',
        data: { repoId: r.id, tenantId: r.tenant_id },
        opts: { removeOnComplete: true },
      }));
      if (lintJobs.length > 0) await this.queue.addBulk(lintJobs);
      this.logger.log(
        `[DataEngine] Fanned out lint to ${lintJobs.length} active repos`,
      );
      return;
    }

    if (job.name === 'lint-repo') {
      const { repoId, tenantId } = job.data;
      await this.wikiLint.lint(repoId, tenantId);
    }
  }

  private async processDocument(data: {
    sourceId: string;
    filePath: string;
    repoId: string;
    tenantId: string;
  }) {
    const { sourceId, filePath, repoId, tenantId } = data;
    const source = await this.sourceRepo.findOneOrFail({
      where: { id: sourceId },
    });

    try {
      // Stage 1: Parse
      await this.sourceRepo.update(sourceId, { status: 'parsing' });
      const parsed = await this.parser.parse(
        filePath,
        source.filename,
        source.mime_type,
      );
      await this.sourceRepo.update(sourceId, {
        page_count: parsed.sections.length,
        parse_quality: parsed.parseQuality,
      });

      // Stage 2: Analyze (AutoData loop)
      await this.sourceRepo.update(sourceId, { status: 'analysing' });
      const claims = await this.analyzer.analyze(parsed);

      // Stage 3: Contradiction detection
      const contradictionResults = await this.contradictionDetector.detect(
        repoId,
        tenantId,
        claims,
      );
      const contradicted = contradictionResults.filter((r) => !r.isNew).length;

      // Stage 4: Wiki compilation
      const pages = await this.wikiCompiler.compile(
        repoId,
        tenantId,
        contradictionResults,
        sourceId,
      );

      // Stage 5: Graph rebuild
      await this.graphBuilder.rebuild(repoId, tenantId);

      // Update source + repo records
      await this.sourceRepo.update(sourceId, {
        status: 'done',
        claims_extracted: claims.length,
      });
      await this.repoRepo.update(repoId, {
        status: 'active',
        page_count: pages.length,
        pending_contradictions: contradicted,
        last_ingest_at: new Date(),
      });

      // Stage 6: Bridge to Parametric Memory (Synthetic Episodes)
      await this.bridge.bridgeWikiToEpisodes(repoId, tenantId);

      this.logger.log(
        `Processed ${source.filename}: ${claims.length} claims, ${pages.length} wiki pages, ${contradicted} contradictions`,
      );
    } catch (err: any) {
      await this.sourceRepo.update(sourceId, {
        status: 'error',
        error_message: err.message,
      });
      this.logger.error(`Failed to process ${source.filename}: ${err.message}`);
      throw err;
    }
  }
}
