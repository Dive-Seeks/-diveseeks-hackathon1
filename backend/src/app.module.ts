import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DataSource } from 'typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { EmailModule } from './email/email.module';
import { SetupBusinessModule } from './setup-business/setup-business.module';
import { FtpModule } from './ftp/ftp.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { BusinessSettingsModule } from './business-settings/business-settings.module';
import { BusinessConfigurationsModule } from './business-configurations/business-configurations.module';
import { GatewaysModule } from './gateways/gateways.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { AccountModule } from './account/account.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CompaniesHouseModule } from './companies-house/companies-house.module';
import { GeoModule } from './geo/geo.module';
import { RoutingModule } from './routing/routing.module';
import { DeliveryModule } from './delivery/delivery.module';
import { TrackingModule } from './tracking/tracking.module';
import { ZonesModule } from './zones/zones.module';
import { CacheModule } from './common/cache/cache.module';
import { StoreModule } from './store/store.module';
import { WorldpayModule } from './worldpay/worldpay.module';
import { VivaModule } from './viva/viva.module';
import { CategoriesModule } from './categories/categories.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { SitesModule } from './sites/sites.module';
import { MenusModule } from './menus/menus.module';
import { PricingModule } from './pricing/pricing.module';
import { CartModule } from './cart/cart.module';
import { CustomersModule } from './customers/customers.module';
import { ExternalIntegrationsModule } from './external-integrations/external-integrations.module';
import { AiIntegrationModule } from './ai-integration/ai-integration.module';
import { StoreImagesModule } from './store-images/store-images.module';
import { MenuEmbeddingsModule } from './menu-embeddings/menu-embeddings.module';
import { WizardProfilesModule } from './wizard-profiles/wizard-profiles.module';
import { MenuImagesModule } from './menu-images/menu-images.module';
import { WebsiteBuilderModule } from './website-builder/website-builder.module';
import { AgentsModule } from './agents/agents.module';
import { IssuesModule } from './issues/issues.module';
import { SpecialistDocumentsModule } from './specialist-documents/specialist-documents.module';
import { ProjectReportModule } from './project-report/project-report.module';
import { RunsModule } from './runs/runs.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ActivityModule } from './activity/activity.module';
import { SoulModule } from './common/soul/soul.module';
import { JosModule } from './jos/jos.module';
import { HeartbeatModule } from './heartbeat/heartbeat.module';
import { AbigailModule } from './abigail/abigail.module';
import { TceModule } from './tce/tce.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { ManagersModule } from './managers/managers.module';
import { ChatModule } from './chat/chat.module';
import { NightTeamModule } from './night-team/night-team.module';
import { MemoryModule } from './memory/memory.module';
import { McpModule } from './mcp/mcp.module';
import { ToolsModule } from './tools/tools.module';
import { MemoryMcpModule } from './mcp-server/memory-mcp.module';
import { CommonModule } from './common/common.module';
import { TenantScopeGuard } from './common/guards/tenant-scope.guard';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { WorkforceModule } from './workforce/workforce.module';
import { ActivityLoggerInterceptor } from './common/interceptors/activity-logger.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { AccountingModule } from './accounting/accounting.module';
import { ClaraModule } from './clara/clara.module';
import { McpRegistryModule } from './mcp-registry/mcp-registry.module';
import { DataEngineModule } from './data-engine/data-engine.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { EvolveModule } from './evolve/evolve.module';
import { HermesModule } from './hermes/hermes.module';
import { AbigailBrainModule } from './abigail-brain/abigail-brain.module';
import { TokenizerModule } from './tokenizer/tokenizer.module';
import { WebResearchModule } from './web-research/web-research.module';
import { KnowledgeStoreModule } from './knowledge-store/knowledge-store.module';
import { DeepReasoningModule } from './abigail/deep-reasoning/deep-reasoning.module';
import { ApiFusionModule } from './api-fusion/api-fusion.module';
import { PromptEngineModule } from './prompt-engine/prompt-engine.module';
import { WorkflowEngineModule } from './workflow-engine/workflow-engine.module';
import { AuditLoopModule } from './audit-loop/audit-loop.module';
import { TaskManagerModule } from './task-manager/task-manager.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { KnowledgeRegistrarModule } from './knowledge-registrar/knowledge-registrar.module';
import { CoordinatorModule } from './coordinator/coordinator.module';
import { A2ARunnerModule } from './a2a-runner/a2a-runner.module';
import { ObservabilityModule } from './observability/observability.module';
import { HttpMetricsInterceptor } from './observability/http-metrics.interceptor';
import { CycleAuditModule } from './cycle-audit/cycle-audit.module';
import { GithubModule } from './github/github.module';
import { TaskPrdModule } from './task-prd/task-prd.module';
import { ClsModule } from 'nestjs-cls';
import { AbigailCoreModule } from './abigail-core/abigail-core.module';
import { ProjectFeedModule } from './project-feed/project-feed.module';
import { DreamerModule } from './dreamer/dreamer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ScheduleModule.forRoot(),
    CacheModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<number>('DB_PORT')),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        };
        console.log('[DB] Final DB Config:', { ...dbConfig, password: '****' });
        console.log(
          'Looking for entities in:',
          __dirname + '/**/*.entity{.ts,.js}',
        );
        return {
          ...dbConfig,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: true,
          connectTimeoutMS: 10000,
        };
      },
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('TypeORM DataSourceOptions missing');
        const { DataSource: DS } = await import('typeorm');
        const dataSource = new DS(options);
        // Install pgvector extension before synchronize runs
        const pgClient = new (await import('pg')).Client({
          host: (options as any).host,
          port: (options as any).port,
          user: (options as any).username,
          password: (options as any).password,
          database: (options as any).database,
        });
        try {
          await pgClient.connect();
          await pgClient.query('CREATE EXTENSION IF NOT EXISTS vector');
        } catch (e) {
          console.warn('[pgvector] extension pre-install failed:', e.message);
        } finally {
          await pgClient.end();
        }
        return dataSource.initialize();
      },
    }),
    /*
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/dive_pos',
      }),
    }),
    */
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost =
          configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        console.log(
          `[BullMQ] Connecting to Redis at ${redisHost}:${redisPort}`,
        );

        return {
          connection: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            // Add reconnection strategy to prevent crashes
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 100, 3000);
              console.log(
                `[BullMQ] Redis reconnect attempt ${times}, retrying in ${delay}ms`,
              );
              return delay;
            },
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (): ThrottlerModuleOptions => [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    AbigailCoreModule,
    UsersModule,
    AuthModule,
    SessionsModule,
    EmailModule,
    SetupBusinessModule,
    FtpModule,
    DepartmentsModule,
    EmployeesModule,
    BusinessSettingsModule,
    BusinessConfigurationsModule,
    GatewaysModule,
    StoresModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    AccountModule,
    BillingModule,
    NotificationsModule,
    CompaniesHouseModule,
    GeoModule,
    RoutingModule,
    DeliveryModule,
    TrackingModule,
    ZonesModule,
    StoreModule,
    WorldpayModule,
    VivaModule,
    CategoriesModule,
    ModifiersModule,
    SitesModule,
    MenusModule,
    PricingModule,
    CartModule,
    AccountingModule,
    ClaraModule,
    CustomersModule,
    ExternalIntegrationsModule,
    AiIntegrationModule,
    StoreImagesModule,
    MenuEmbeddingsModule,
    WizardProfilesModule,
    MenuImagesModule,
    WebsiteBuilderModule,
    AgentsModule,
    IssuesModule,
    SpecialistDocumentsModule,
    ProjectReportModule,
    RunsModule,
    ApprovalsModule,
    ActivityModule,
    SoulModule,
    JosModule,
    HeartbeatModule,
    AbigailModule,
    TceModule,
    SpecialistsModule,
    ManagersModule,
    ChatModule,
    NightTeamModule,
    MemoryModule,
    McpModule,
    ToolsModule,
    MemoryMcpModule,
    CommonModule,
    WorkforceModule,
    McpRegistryModule,
    DataEngineModule,
    SandboxModule,
    EvolveModule,
    HermesModule,
    AbigailBrainModule,
    TokenizerModule,
    WebResearchModule,
    KnowledgeStoreModule,
    DeepReasoningModule,
    ApiFusionModule,
    PromptEngineModule,
    WorkflowEngineModule,
    AuditLoopModule,
    TaskManagerModule,
    MarketplaceModule,
    KnowledgeRegistrarModule,
    CoordinatorModule,
    A2ARunnerModule,
    ObservabilityModule,
    CycleAuditModule,
    GithubModule,
    TaskPrdModule,
    ProjectFeedModule,
    DreamerModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantScopeGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_agent_sessions_site_waiting"
        ON agent_sessions (site_id)
        WHERE status = 'waiting_approval';
      `);
    } catch (e) {
      console.warn('pgvector extension or index creation failed.');
    }
  }
}
