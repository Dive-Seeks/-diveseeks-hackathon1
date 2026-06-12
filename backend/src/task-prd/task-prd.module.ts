import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskPrdRequirement } from './entities/task-prd-requirement.entity';
import { TeamRegistration } from './entities/team-registration.entity';
import { FlagRegistration } from './entities/flag-registration.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { EvaluatorRegistryService } from './registries/evaluator-registry.service';
import { FlagRegistryService } from './registries/flag-registry.service';
import { TeamRegistryService } from './registries/team-registry.service';
import { LoopOrchestratorService } from './loop-orchestrator.service';
import { PrdGeneratorService } from './prd-generator.service';
import { GoalProgressService } from './goal-progress.service';
import { TaskPrdController } from './task-prd.controller';
import { DomWatcherService } from './watchers/dom-watcher.service';
import { AbigailModule } from '../abigail/abigail.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { TceModule } from '../tce/tce.module';
import { CommonModule } from '../common/common.module';
import { DomWatcherEvaluatorService } from './evaluators/coding/dom-watcher-evaluator.service';
import { FileChangeEvaluatorService } from './evaluators/coding/file-change-evaluator.service';
import { HumanCodeReviewEvaluatorService } from './evaluators/coding/human-code-review-evaluator.service';
import { HurlPassEvaluatorService } from './evaluators/coding/hurl-pass-evaluator.service';
import { KaiApprovalEvaluatorService } from './evaluators/coding/kai-approval-evaluator.service';
import { LintEvaluatorService } from './evaluators/coding/lint-evaluator.service';
import { SecurityScanEvaluatorService } from './evaluators/coding/security-scan-evaluator.service';
import { TestPassEvaluatorService } from './evaluators/coding/test-pass-evaluator.service';
import { TypecheckEvaluatorService } from './evaluators/coding/typecheck-evaluator.service';
import { VisionConstraintEvaluatorService } from './evaluators/coding/vision-constraint-evaluator.service';
import { CitationsEvaluatorService } from './evaluators/general/citations-evaluator.service';
import { CoverageEvaluatorService } from './evaluators/general/coverage-evaluator.service';
import { FactcheckEvaluatorService } from './evaluators/general/factcheck-evaluator.service';
import { HumanTextApprovalEvaluatorService } from './evaluators/general/human-text-approval-evaluator.service';
import { LengthRangeEvaluatorService } from './evaluators/general/length-range-evaluator.service';
import { NoHallucinationEvaluatorService } from './evaluators/general/no-hallucination-evaluator.service';
import { StructuredFormatEvaluatorService } from './evaluators/general/structured-format-evaluator.service';
import { ToneEvaluatorService } from './evaluators/general/tone-evaluator.service';
import { ContradictionCheckEvaluatorService } from './evaluators/research/contradiction-check-evaluator.service';
import { DatasetCitationEvaluatorService } from './evaluators/research/dataset-citation-evaluator.service';
import { DoiEvaluatorService } from './evaluators/research/doi-evaluator.service';
import { HumanResearchApprovalEvaluatorService } from './evaluators/research/human-research-approval-evaluator.service';
import { PeerReviewCycleEvaluatorService } from './evaluators/research/peer-review-cycle-evaluator.service';
import { PeerReviewedEvaluatorService } from './evaluators/research/peer-reviewed-evaluator.service';
import { PrimarySourceEvaluatorService } from './evaluators/research/primary-source-evaluator.service';
import { RecencyEvaluatorService } from './evaluators/research/recency-evaluator.service';
import { ReproducibleMethodEvaluatorService } from './evaluators/research/reproducible-method-evaluator.service';
import { StatisticalRigorEvaluatorService } from './evaluators/research/statistical-rigor-evaluator.service';
import { HumanApprovalEvaluatorService } from './evaluators/shared/human-approval-evaluator.service';
import { VisionAlignmentEvaluatorService } from './evaluators/shared/vision-alignment-evaluator.service';
import { CodingTeamBootstrapService } from './bootstrap/coding-team-bootstrap.service';
import { GeneralTeamBootstrapService } from './bootstrap/general-team-bootstrap.service';
import { ResearchTeamBootstrapService } from './bootstrap/research-team-bootstrap.service';
import { PrdMemoryBridgeService } from './prd-memory-bridge.service';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { EvolveModule } from '../evolve/evolve.module';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { TCETask } from '../tce/entities/tce-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskPrdFeatureMap,
      TaskPrdRequirement,
      TeamRegistration,
      FlagRegistration,
      TaskSession,
      AgentEpisode,
      AgentIssue,
      TCETask,
    ]),
    forwardRef(() => AbigailModule),
    forwardRef(() => EvolveModule),
    GatewaysModule,
    TceModule,
    CommonModule,
    TokenizerModule,
  ],
  controllers: [TaskPrdController],
  providers: [
    EvaluatorRegistryService,
    FlagRegistryService,
    TeamRegistryService,
    LoopOrchestratorService,
    PrdGeneratorService,
    GoalProgressService,
    DomWatcherService,
    DomWatcherEvaluatorService,
    {
      provide: 'DomWatcherEvaluatorService',
      useExisting: DomWatcherEvaluatorService,
    },
    FileChangeEvaluatorService,
    {
      provide: 'FileChangeEvaluatorService',
      useExisting: FileChangeEvaluatorService,
    },
    HumanCodeReviewEvaluatorService,
    {
      provide: 'HumanCodeReviewEvaluatorService',
      useExisting: HumanCodeReviewEvaluatorService,
    },
    HurlPassEvaluatorService,
    {
      provide: 'HurlPassEvaluatorService',
      useExisting: HurlPassEvaluatorService,
    },
    KaiApprovalEvaluatorService,
    {
      provide: 'KaiApprovalEvaluatorService',
      useExisting: KaiApprovalEvaluatorService,
    },
    LintEvaluatorService,
    { provide: 'LintEvaluatorService', useExisting: LintEvaluatorService },
    SecurityScanEvaluatorService,
    {
      provide: 'SecurityScanEvaluatorService',
      useExisting: SecurityScanEvaluatorService,
    },
    TestPassEvaluatorService,
    {
      provide: 'TestPassEvaluatorService',
      useExisting: TestPassEvaluatorService,
    },
    TypecheckEvaluatorService,
    {
      provide: 'TypecheckEvaluatorService',
      useExisting: TypecheckEvaluatorService,
    },
    VisionConstraintEvaluatorService,
    {
      provide: 'VisionConstraintEvaluatorService',
      useExisting: VisionConstraintEvaluatorService,
    },
    CitationsEvaluatorService,
    {
      provide: 'CitationsEvaluatorService',
      useExisting: CitationsEvaluatorService,
    },
    CoverageEvaluatorService,
    {
      provide: 'CoverageEvaluatorService',
      useExisting: CoverageEvaluatorService,
    },
    FactcheckEvaluatorService,
    {
      provide: 'FactcheckEvaluatorService',
      useExisting: FactcheckEvaluatorService,
    },
    HumanTextApprovalEvaluatorService,
    {
      provide: 'HumanTextApprovalEvaluatorService',
      useExisting: HumanTextApprovalEvaluatorService,
    },
    LengthRangeEvaluatorService,
    {
      provide: 'LengthRangeEvaluatorService',
      useExisting: LengthRangeEvaluatorService,
    },
    NoHallucinationEvaluatorService,
    {
      provide: 'NoHallucinationEvaluatorService',
      useExisting: NoHallucinationEvaluatorService,
    },
    StructuredFormatEvaluatorService,
    {
      provide: 'StructuredFormatEvaluatorService',
      useExisting: StructuredFormatEvaluatorService,
    },
    ToneEvaluatorService,
    { provide: 'ToneEvaluatorService', useExisting: ToneEvaluatorService },
    ContradictionCheckEvaluatorService,
    {
      provide: 'ContradictionCheckEvaluatorService',
      useExisting: ContradictionCheckEvaluatorService,
    },
    DatasetCitationEvaluatorService,
    {
      provide: 'DatasetCitationEvaluatorService',
      useExisting: DatasetCitationEvaluatorService,
    },
    DoiEvaluatorService,
    { provide: 'DoiEvaluatorService', useExisting: DoiEvaluatorService },
    HumanResearchApprovalEvaluatorService,
    {
      provide: 'HumanResearchApprovalEvaluatorService',
      useExisting: HumanResearchApprovalEvaluatorService,
    },
    PeerReviewCycleEvaluatorService,
    {
      provide: 'PeerReviewCycleEvaluatorService',
      useExisting: PeerReviewCycleEvaluatorService,
    },
    PeerReviewedEvaluatorService,
    {
      provide: 'PeerReviewedEvaluatorService',
      useExisting: PeerReviewedEvaluatorService,
    },
    PrimarySourceEvaluatorService,
    {
      provide: 'PrimarySourceEvaluatorService',
      useExisting: PrimarySourceEvaluatorService,
    },
    RecencyEvaluatorService,
    {
      provide: 'RecencyEvaluatorService',
      useExisting: RecencyEvaluatorService,
    },
    ReproducibleMethodEvaluatorService,
    {
      provide: 'ReproducibleMethodEvaluatorService',
      useExisting: ReproducibleMethodEvaluatorService,
    },
    StatisticalRigorEvaluatorService,
    {
      provide: 'StatisticalRigorEvaluatorService',
      useExisting: StatisticalRigorEvaluatorService,
    },
    HumanApprovalEvaluatorService,
    {
      provide: 'HumanApprovalEvaluatorService',
      useExisting: HumanApprovalEvaluatorService,
    },
    VisionAlignmentEvaluatorService,
    {
      provide: 'VisionAlignmentEvaluatorService',
      useExisting: VisionAlignmentEvaluatorService,
    },
    CodingTeamBootstrapService,
    GeneralTeamBootstrapService,
    ResearchTeamBootstrapService,
    PrdMemoryBridgeService,
  ],
  exports: [
    TypeOrmModule,
    LoopOrchestratorService,
    PrdGeneratorService,
    GoalProgressService,
    DomWatcherService,
    TeamRegistryService,
    FlagRegistryService,
    PrdMemoryBridgeService,
  ],
})
export class TaskPrdModule {}
