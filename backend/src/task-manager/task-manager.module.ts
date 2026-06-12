import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskAttempt } from './entities/task-attempt.entity';
import { TaskTemplate } from './entities/task-template.entity';

import { TaskManagerService } from './services/task-manager.service';
import { TaskManagerProcessor } from './task-manager.processor';
import { TaskManagerController } from './task-manager.controller';
import { TASK_MANAGER_QUEUE } from './task-manager.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskDependency, TaskAttempt, TaskTemplate]),
    BullModule.registerQueue({ name: TASK_MANAGER_QUEUE }),
  ],
  providers: [TaskManagerService, TaskManagerProcessor],
  controllers: [TaskManagerController],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}
