import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFeedMessage } from './entities/project-feed-message.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ProjectFeedService } from './project-feed.service';
import { ProjectFeedController } from './project-feed.controller';
import { ProjectFeedListener } from './project-feed.listener';
import { GatewaysModule } from '../gateways/gateways.module';
import { AbigailModule } from '../abigail/abigail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectFeedMessage, ChatMessage]),
    GatewaysModule,
    forwardRef(() => AbigailModule),
  ],
  providers: [ProjectFeedService, ProjectFeedListener],
  controllers: [ProjectFeedController],
  exports: [ProjectFeedService],
})
export class ProjectFeedModule {}
