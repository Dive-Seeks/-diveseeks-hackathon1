import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TaskSession } from '../entities/task-session.entity';
import { TCETask } from '../../tce/entities/tce-task.entity';
import {
  TaskOutcome,
  taskOutcomeToSessionStatus,
  sessionStatusToTceStatus,
} from '../../common/workflow-status.types';

@Injectable()
export class TaskOutcomeMapper {
  constructor(
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Persist the outcome of one specialist run atomically:
   * 1. Set TaskSession.status from taskOutcome
   * 2. Write the matching TceTask.status back
   *
   * Both writes are wrapped in a single transaction — if the second write fails,
   * the session status is rolled back so the two tables never diverge.
   * The @Transaction() decorator is deprecated in TypeORM 0.3; use DataSource.transaction() instead.
   */
  async apply(
    session: TaskSession,
    outcome: TaskOutcome,
    tceTaskId: string | undefined,
  ): Promise<void> {
    const newStatus = taskOutcomeToSessionStatus(outcome);
    await this.dataSource.transaction(async (manager) => {
      session.status = newStatus;
      await manager.save(TaskSession, session);
      if (tceTaskId) {
        await manager.update(TCETask, tceTaskId, {
          status: sessionStatusToTceStatus(newStatus),
        });
      }
    });
  }
}
