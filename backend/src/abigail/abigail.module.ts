import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AbigailController } from './abigail.controller';
import { AbigailService } from './abigail.service';
import { AbigailMindService } from './abigail-mind.service';
import { RoutingService } from './routing.service';
import { BudgetService } from './budget.service';
import { CompactionService } from './compaction.service';
import { AgentSessionsController } from './agent-sessions.controller';
import { AgentSessionsService } from './agent-sessions.service';
import { SessionSummaryService } from './session-summary.service';
import { HireService } from './hire.service';
import { SnapshotService } from './snapshot/snapshot.service';
import { RulesService } from './rules/rules.service';
import { RulesFileService } from './rules/rules-file.service';
import { DataEngineContextService } from './data-engine-context.service';
import { GitContextService } from './git-context.service';

import { TaskSession } from './entities/task-session.entity';
import { AgentSession } from './entities/agent-session.entity';
import { AgentEvolutionEvent } from '../jos/entities/agent-evolution-event.entity';
import { DeveloperProfile } from './entities/developer-profile.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { WikiPage } from '../data-engine/entities/wiki-page.entity';
import { DataRepo } from '../data-engine/entities/data-repo.entity';
import { TenantKnowledge } from '../knowledge-store/entities/tenant-knowledge.entity';
import { Agent } from '../agents/entities/agent.entity';
import { ParametricWeight } from '../memory/entities/parametric-weight.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { AuditFinding } from '../audit-loop/entities/audit-loop.entity';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { UnifiedKnowledgeService } from './unified-knowledge.service';
import { TceModule } from '../tce/tce.module';
import { HeartbeatModule } from '../heartbeat/heartbeat.module';
import { AgentsModule } from '../agents/agents.module';
import { McpModule } from '../mcp/mcp.module';
import { McpRegistryModule } from '../mcp-registry/mcp-registry.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { SandboxModule } from '../sandbox/sandbox.module';
import { MemoryModule } from '../memory/memory.module';
import { EvolveModule } from '../evolve/evolve.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { HermesModule } from '../hermes/hermes.module';
import { AbigailBrainModule } from '../abigail-brain/abigail-brain.module';
import { DeepReasoningModule } from './deep-reasoning/deep-reasoning.module';
import { ArchitecturalRulesModule } from './architectural-rules/architectural-rules.module';
import { CacheModule } from '../common/cache/cache.module';
import { CommonModule } from '../common/common.module';
import { DataEngineModule } from '../data-engine/data-engine.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { FileExtractorService } from './file-extractor.service';
import { DisciplineScorerService } from './discipline-scorer.service';
import { SessionCompactorService } from './session/session-compactor.service';
import { IssuesModule } from '../issues/issues.module';
import { TaskPrdModule } from '../task-prd/task-prd.module';

import { ProjectContextService } from './project-context.service';
import { ProjectIntentService } from './project-intent.service';
import { ProjectCardService } from './project-card.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { ProjectCompletionReviewService } from './project-completion-review.service';
import { ProjectMemoryService } from './project-memory.service';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';
import { ProjectFeedModule } from '../project-feed/project-feed.module';
import { TenantSpecialistConfigService } from './tenant-specialist-config.service';
import { TenantSpecialistConfig } from './entities/tenant-specialist-config.entity';
import { PredictionEngineModule } from './prediction/prediction-engine.module';
import { DispatchEngineModule } from './dispatch/dispatch-engine.module';
import { DispatchEngineService } from './dispatch/dispatch-engine.service';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { TaskStepLog } from './entities/task-step-log.entity';
import { TaskPrdFeatureMap } from '../task-prd/entities/task-prd-feature-map.entity';
import { AgentChatModule } from '../agent-chat/agent-chat.module';
import { SpecialistDocumentsModule } from '../specialist-documents/specialist-documents.module';
import { ChatModule } from '../chat/chat.module';
import { KnowledgeStoreModule } from '../knowledge-store/knowledge-store.module';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { DreamerModule } from '../dreamer/dreamer.module';
import { BootService } from './boot.service';
import { PlatformSeedService } from './platform-seed.service';
import { CodingSpecialistFactory } from './specialists/coding-specialist.factory';
import { CodingSpecialistBootstrapService } from './specialists/coding-specialist-bootstrap.service';
import { SpecialistRegistryService } from './specialists/specialist-registry.service';
import { SpecialistRegistryBootstrapService } from './specialists/specialist-registry-bootstrap.service';
import { GeneralRoutingService } from './specialists/general/general-routing.service';
import { TaskDomainClassifierService } from './specialists/task-domain-classifier.service';
import { ResearchRegistryBootstrapService } from './specialists/research-registry-bootstrap.service';
import { ResearchRoutingService } from './specialists/research/research-routing.service';
import {
  LitSpecialist,
  CiteSpecialist,
  HypoSpecialist,
  PeerSpecialist,
  ScribeSpecialist,
  TutorSpecialist,
  ProfSpecialist,
  GrantSpecialist,
  DataSpecialist,
  SynthSpecialist,
} from './specialists/research/research-specialists';
import {
  EchoSpecialist,
  LyraSpecialist,
  SparkSpecialist,
  ZoeSpecialist,
  GistSpecialist,
  MemoSpecialist,
  TranSpecialist,
  PlanSpecialist,
  VibeSpecialist,
  QuestSpecialist,
} from './specialists/general/general-specialists';
import {
  RexSpecialist,
  NovaSpecialist,
  KaiSpecialist,
  SageSpecialist,
  AtlasSpecialist,
  OrionSpecialist,
  PixelSpecialist,
  LumaSpecialist,
  FelixSpecialist,
  VexSpecialist,
} from './specialists/specialists';
import { ChatAgentFactory } from './specialists/chat-agent.factory';
import {
  AGENT_RUN_QUEUE,
  AGENT_SESSION_QUEUE,
} from './workflow-queue/workflow-queue.constants';
import { WorkflowRunService } from './workflow-queue/workflow-run.service';
import { BullMqOrchestrator } from './workflow-queue/workflow-queue.service';
import { AgentRunProcessor } from './workflow-queue/agent-run.processor';
import { AgentSessionProcessor } from './workflow-queue/agent-session.processor';
import { WORKFLOW_ORCHESTRATOR } from './workflow-queue/workflow-orchestrator.interface';
import { AdkOrchestrator } from './workflow-queue/adk-orchestrator.service';
import { HttpModule } from '@nestjs/axios';
import { workflowBackendProvider } from './workflow-queue/workflow-backend.provider';
import { AdkEventTranslatorService } from './adk-events/adk-event-translator.service';
import { AdkPubSubSubscriberService } from './adk-events/adk-pubsub-subscriber.service';
import { AdkHitlController } from './adk-hitl.controller';
import { TaskSeedService } from './task-seed.service';
import { AgentSkill } from '../workforce/skills/skill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskSession,
      AgentSession,
      AgentEvolutionEvent,
      DeveloperProfile,
      WikiPage,
      DataRepo,
      TenantKnowledge,
      Agent,
      ParametricWeight,
      AgentEpisode,
      AuditFinding,
      TCETask,
      ChatMessage,
      TenantSpecialistConfig,
      TaskStepLog,
      TaskPrdFeatureMap,
      DiveSeeksProject,
      AgentIssue,
      AgentSkill,
    ]),
    HttpModule,
    TokenizerModule,
    AgentChatModule,
    SpecialistDocumentsModule,
    ChatModule,
    KnowledgeStoreModule,
    TceModule,
    HeartbeatModule,
    AgentsModule,
    McpModule,
    McpRegistryModule,
    GatewaysModule,
    SandboxModule,
    MemoryModule,
    EvolveModule,
    BullModule.registerQueue({ name: 'brain-memory' }),
    BullModule.registerQueue({ name: AGENT_RUN_QUEUE }),
    BullModule.registerQueue({ name: AGENT_SESSION_QUEUE }),
    forwardRef(() => ReasoningModule),
    HermesModule,
    forwardRef(() => AbigailBrainModule),
    DeepReasoningModule,
    ArchitecturalRulesModule,
    CacheModule,
    IssuesModule,
    forwardRef(() => TaskPrdModule),
    forwardRef(() => PredictionEngineModule),
    DispatchEngineModule,
    CommonModule,
    DataEngineModule,
    WorkforceModule,
    ProjectFeedModule,
    forwardRef(() => DreamerModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AbigailController, AgentSessionsController, AdkHitlController],
  providers: [
    AbigailService,
    AbigailMindService,
    RoutingService,
    BudgetService,
    CompactionService,
    AgentSessionsService,
    SessionSummaryService,
    HireService,
    SnapshotService,
    RulesService,
    RulesFileService,
    DataEngineContextService,
    GitContextService,
    UnifiedKnowledgeService,
    FileExtractorService,
    DisciplineScorerService,
    SessionCompactorService,
    ProjectContextService,
    TenantSpecialistConfigService,
    ProjectIntentService,
    ProjectCardService,
    ProjectLifecycleService,
    ProjectCompletionReviewService,
    ProjectMemoryService,

    BootService,
    PlatformSeedService,
    CodingSpecialistBootstrapService,
    CodingSpecialistFactory,
    SpecialistRegistryService,
    SpecialistRegistryBootstrapService,
    TaskDomainClassifierService,
    GeneralRoutingService,
    ResearchRegistryBootstrapService,
    ResearchRoutingService,
    EchoSpecialist,
    LyraSpecialist,
    SparkSpecialist,
    ZoeSpecialist,
    GistSpecialist,
    MemoSpecialist,
    TranSpecialist,
    PlanSpecialist,
    VibeSpecialist,
    QuestSpecialist,
    LitSpecialist,
    CiteSpecialist,
    HypoSpecialist,
    PeerSpecialist,
    ScribeSpecialist,
    TutorSpecialist,
    ProfSpecialist,
    GrantSpecialist,
    DataSpecialist,
    SynthSpecialist,
    RexSpecialist,
    NovaSpecialist,
    KaiSpecialist,
    SageSpecialist,
    AtlasSpecialist,
    OrionSpecialist,
    PixelSpecialist,
    LumaSpecialist,
    FelixSpecialist,
    VexSpecialist,

    ChatAgentFactory,
    WorkflowRunService,
    BullMqOrchestrator,
    AdkOrchestrator,
    workflowBackendProvider,
    AgentRunProcessor,
    AgentSessionProcessor,
    AdkEventTranslatorService,
    AdkPubSubSubscriberService,
    TaskSeedService,
  ],
  exports: [
    AbigailService,
    CodingSpecialistFactory,
    CodingSpecialistBootstrapService,
    DisciplineScorerService,
    AbigailMindService,
    HireService,
    SessionSummaryService,
    AgentSessionsService,
    BudgetService,
    SnapshotService,
    RoutingService,
    SessionCompactorService,
    ProjectContextService,
    GitContextService,
    TenantSpecialistConfigService,
    SpecialistRegistryService,
    TaskDomainClassifierService,
    GeneralRoutingService,
    ResearchRoutingService,
    UnifiedKnowledgeService,
    DispatchEngineModule,
    ProjectCardService,
    ProjectMemoryService,
    WorkflowRunService,
    BullMqOrchestrator,
    WORKFLOW_ORCHESTRATOR,
  ],
})
export class AbigailModule {}
