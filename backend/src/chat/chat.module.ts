import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CorrectionDetector } from './correction-detector';
import { ChatMessage } from './entities/chat-message.entity';
import { UserChatMessage } from './entities/user-chat-message.entity';
import { ChatController } from './chat.controller';
import { UserChatService } from './user-chat.service';
import { ChatHistoryService } from './chat-history.service';
import { TokenizerModule } from '../tokenizer/tokenizer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, UserChatMessage]),
    BullModule.registerQueue({ name: 'brain-memory' }),
    TokenizerModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    CorrectionDetector,
    UserChatService,
    ChatHistoryService,
  ],
  exports: [ChatService, UserChatService, ChatHistoryService],
})
export class ChatModule {}
