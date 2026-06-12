import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WorkflowDefinition } from '../entities/workflow-definition.entity';

import {
  WorkflowExecution,
  WorkflowStatus,
} from '../entities/workflow-execution.entity';

import { WORKFLOW_ENGINE_QUEUE, WorkflowJobs } from '../workflow-engine.queue';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger('WorkflowExecutorService');
  static serviceName = 'WorkflowExecutorService';

  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
    @InjectQueue(WORKFLOW_ENGINE_QUEUE)
    private readonly workflowQueue: Queue,
  ) {}

  async startWorkflow(
    definitionName: string,
    initialState: Record<string, any>,
    tenantId?: string,
    userId?: string,
  ): Promise<WorkflowExecution> {
    const definition = await this.definitionRepo.findOne({
      where: { name: definitionName, isActive: true },
    });
    if (!definition) {
      throw new Error(`Workflow definition "${definitionName}" not found`);
    }

    const execution = await this.executionRepo.save(
      this.executionRepo.create({
        definitionId: definition.id,
        status: WorkflowStatus.RUNNING,
        state: initialState,
        completedSteps: [],
        tenantId,
        userId,
      }),
    );

    this.logger.log(`Starting workflow ${definition.name} (${execution.id})`);

    // Queue initial steps (no dependencies)
    await this.queueNextSteps(execution, definition);

    return execution;
  }

  async queueNextSteps(
    execution: WorkflowExecution,
    definition: WorkflowDefinition,
  ): Promise<void> {
    const readySteps = definition.steps.filter((step) => {
      // Step is already completed
      if (execution.completedSteps.includes(step.key)) return false;

      // Step has no dependencies
      if (!step.dependsOn || step.dependsOn.length === 0) return true;

      // All dependencies are completed
      return step.dependsOn.every((dep) =>
        execution.completedSteps.includes(dep),
      );
    });

    if (
      readySteps.length === 0 &&
      execution.completedSteps.length < definition.steps.length
    ) {
      this.logger.warn(
        `Workflow ${execution.id} is stuck! No steps ready but not all steps completed.`,
      );
      return;
    }

    if (execution.completedSteps.length === definition.steps.length) {
      await this.executionRepo.update(execution.id, {
        status: WorkflowStatus.COMPLETED,
        completedAt: new Date(),
      });
      this.logger.log(`Workflow ${execution.id} completed successfully`);
      return;
    }

    for (const step of readySteps) {
      await this.workflowQueue.add(
        WorkflowJobs.EXECUTE_STEP,
        {
          executionId: execution.id,
          stepKey: step.key,
        },
        {
          jobId: `workflow:${execution.id}:step:${step.key}`, // Idempotency
          removeOnComplete: true,
        },
      );
      this.logger.debug(`Queued step ${step.key} for workflow ${execution.id}`);
    }
  }
}
