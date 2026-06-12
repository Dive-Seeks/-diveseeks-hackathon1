import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { GithubInstallation } from './entities/github-installation.entity';
import { GithubRepo } from './entities/github-repo.entity';
import { GithubSourceDocument } from './entities/source-document.entity';
import { GithubService } from './github.service';
import { GithubIndexProcessor } from './github-index.processor';
import { GithubController } from './github.controller';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { CommonModule } from '../common/common.module';
import { GITHUB_INDEX_QUEUE } from './github.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallation,
      GithubRepo,
      GithubSourceDocument,
    ]),
    BullModule.registerQueue({ name: GITHUB_INDEX_QUEUE }),
    AiIntegrationModule,
    CommonModule,
  ],
  controllers: [GithubController],
  providers: [GithubService, GithubIndexProcessor],
  exports: [GithubService],
})
export class GithubModule {}
