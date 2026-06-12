import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UserPreference } from './entities/user-preference.entity';
import { DreamerRun } from './entities/dreamer-run.entity';
import { DreamerConfig } from './entities/dreamer-config.entity';
import { DreamerService } from './dreamer.service';
import { DreamerProcessor } from './dreamer.processor';
import { DreamerReflectionService } from './dreamer-reflection.service';
import { DreamerPreferencesService } from './dreamer-preferences.service';
import { DreamerScheduleService } from './dreamer-schedule.service';
import { DreamerConfigController } from './dreamer-config.controller';
import { ChatModule } from '../chat/chat.module';
import { UserChatMessage } from '../chat/entities/user-chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreference,
      DreamerRun,
      DreamerConfig,
      UserChatMessage,
    ]),
    BullModule.registerQueue({ name: 'dreamer' }),
    ChatModule,
  ],
  controllers: [DreamerConfigController],
  providers: [
    DreamerService,
    DreamerProcessor,
    DreamerReflectionService,
    DreamerPreferencesService,
    DreamerScheduleService,
  ],
  exports: [DreamerPreferencesService],
})
export class DreamerModule {}
