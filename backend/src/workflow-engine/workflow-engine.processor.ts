import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkflowExecution,
  WorkflowStatus,
} from './entities/workflow-execution.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import {
  WorkflowStepExecution,
  StepExecutionStatus,
} from './entities/workflow-step-execution.entity';
import { WORKFLOW_ENGINE_QUEUE, WorkflowJobs } from './workflow-engine.queue';
import { AUDIT_LOOP_QUEUE, AuditJobs } from '../audit-loop/audit-loop.queue';
import { PromptEngineService } from '../prompt-engine/services/prompt-engine.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { HermesGateway } from '../hermes/hermes.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Processor(WORKFLOW_ENGINE_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowStepExecution)
    private readonly stepExecRepo: Repository<WorkflowStepExecution>,
    private readonly promptEngine: PromptEngineService,
    private readonly executorService: WorkflowExecutorService,
    @InjectQueue(AUDIT_LOOP_QUEUE) private readonly auditQueue: Queue,
    @Optional() private readonly gateway?: HermesGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case WorkflowJobs.EXECUTE_STEP:
        return this.handleExecuteStep(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private emit(tenantId: string, event: string, payload: object): void {
    if (this.gateway?.server) {
      this.gateway.server.to(`tenant:${tenantId}`).emit(event, payload);
    }
  }

  private async handleExecuteStep(data: {
    executionId: string;
    stepKey: string;
  }): Promise<void> {
    const { executionId, stepKey } = data;

    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
    });
    if (!execution || execution.status !== WorkflowStatus.RUNNING) return;

    const definition = await this.definitionRepo.findOne({
      where: { id: execution.definitionId },
    });
    if (!definition) return;

    const step = definition.steps.find((s) => s.key === stepKey);
    if (!step) return;

    const startTime = Date.now();

    const stepExec = await this.stepExecRepo.save(
      this.stepExecRepo.create({
        executionId,
        stepKey,
        status: StepExecutionStatus.RUNNING,
        input: {},
      }),
    );

    this.emit(execution.tenantId, 'workflow_step_started', {
      executionId,
      stepKey,
      stepExecutionId: stepExec.id,
    });

    this.logger.log(`Executing step ${stepKey} for workflow ${executionId}`);

    const variables: Record<string, any> = {};
    if (step.inputMapping) {
      for (const [varName, stateKey] of Object.entries(step.inputMapping)) {
        variables[varName] = execution.state[stateKey];
      }
    }

    try {
      const output = await this.promptEngine.execute(
        step.promptTemplateName,
        variables,
        {
          tenantId: execution.tenantId,
        },
      );

      const durationMs = Date.now() - startTime;

      await this.stepExecRepo.update(stepExec.id, {
        status: StepExecutionStatus.COMPLETED,
        output: { text: output } as any,
        durationMs,
        completedAt: new Date(),
      });

      const newState = { ...execution.state };
      if (step.outputKey) newState[step.outputKey] = output;

      const updatedExecution = await this.executionRepo.save({
        ...execution,
        state: newState,
        completedSteps: [...execution.completedSteps, stepKey],
      });

      this.emit(execution.tenantId, 'workflow_step_completed', {
        executionId,
        stepKey,
        stepExecutionId: stepExec.id,
        durationMs,
        outputKey: step.outputKey,
      });

      // Trigger Streaming Audit (Gap G)
      if (execution.state.loopId) {
        await this.auditQueue.add(
          AuditJobs.AUDIT_STEP,
          {
            loopId: execution.state.loopId,
            round: execution.state.round || 1,
            stepKey,
            output,
            tenantId: execution.tenantId,
          },
          {
            removeOnComplete: true,
          },
        );
        this.logger.debug(
          `Queued streaming audit for step ${stepKey} in loop ${execution.state.loopId}`,
        );
      }

      await this.executorService.queueNextSteps(updatedExecution, definition);

      if (updatedExecution.status === WorkflowStatus.COMPLETED) {
        this.emit(execution.tenantId, 'workflow_completed', { executionId });

        // Signal Audit Loop to proceed to Mistake Processing (Gap G)
        if (execution.state.loopId) {
          await this.auditQueue.add(AuditJobs.RUN_PHASE, {
            loopId: execution.state.loopId,
            phase: 'mistake_processing', // Using string since we don't have AuditPhase enum here
          });
          this.logger.log(
            `Workflow completed — Signaling Audit Loop ${execution.state.loopId} to proceed to mistake_processing`,
          );
        }
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await this.stepExecRepo.update(stepExec.id, {
        status: StepExecutionStatus.FAILED,
        error: error.message,
        durationMs,
        completedAt: new Date(),
      });

      await this.executionRepo.update(executionId, {
        status: WorkflowStatus.FAILED,
        error: error.message,
      });

      this.emit(execution.tenantId, 'workflow_step_failed', {
        executionId,
        stepKey,
        stepExecutionId: stepExec.id,
        error: error.message,
      });

      this.logger.error(
        `Step ${stepKey} failed for workflow ${executionId}: ${error.message}`,
      );
    }
  }
}
