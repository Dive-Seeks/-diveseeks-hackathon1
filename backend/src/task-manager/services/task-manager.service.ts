import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Task,
  TaskStatus,
  TaskKind,
  RetryPolicy,
} from '../entities/task.entity';
import {
  TaskDependency,
  DependencyType,
} from '../entities/task-dependency.entity';
import { TaskAttempt } from '../entities/task-attempt.entity';
import { TaskTemplate } from '../entities/task-template.entity';
import { TASK_MANAGER_QUEUE, TaskManagerJobs } from '../task-manager.queue';
import { CreateTaskDto, AddDependencyDto } from '../dto/task-manager.dto';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
};

@Injectable()
export class TaskManagerService {
  private readonly logger = new Logger(TaskManagerService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly depRepo: Repository<TaskDependency>,
    @InjectRepository(TaskAttempt)
    private readonly attemptRepo: Repository<TaskAttempt>,
    @InjectRepository(TaskTemplate)
    private readonly templateRepo: Repository<TaskTemplate>,
    @InjectQueue(TASK_MANAGER_QUEUE)
    private readonly queue: Queue,
  ) {}

  async createTask(dto: CreateTaskDto, tenantId: string): Promise<Task> {
    const task = await this.taskRepo.save(
      this.taskRepo.create({
        tenantId,
        subject: dto.subject,
        kind: dto.kind ?? TaskKind.CUSTOM,
        payload: dto.payload ?? {},
        retryPolicy: dto.retryPolicy ?? DEFAULT_RETRY_POLICY,
        timeoutMs: dto.timeoutMs,
        priority: dto.priority ?? 0,
        parentTaskId: dto.parentTaskId,
        workflowExecutionId: dto.workflowExecutionId,
        assignedSpecialist: dto.assignedSpecialist,
        status: TaskStatus.PENDING,
        attemptCount: 0,
      }),
    );

    this.logger.log(`Created task ${task.id}: "${task.subject}"`);
    return task;
  }

  async addDependency(
    taskId: string,
    dto: AddDependencyDto,
    tenantId: string,
  ): Promise<TaskDependency> {
    const [task, dependsOn] = await Promise.all([
      this.taskRepo.findOne({ where: { id: taskId, tenantId } }),
      this.taskRepo.findOne({ where: { id: dto.dependsOnTaskId, tenantId } }),
    ]);

    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    if (!dependsOn)
      throw new NotFoundException(
        `Dependency task ${dto.dependsOnTaskId} not found`,
      );

    await this.detectCycle(taskId, dto.dependsOnTaskId);

    return this.depRepo.save(
      this.depRepo.create({
        dependentTaskId: taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
        dependencyType: dto.dependencyType ?? DependencyType.SUCCESS,
        outputPath: dto.outputPath,
        inputKey: dto.inputKey,
      }),
    );
  }

  async checkAndEnqueueReady(
    tenantId: string,
    workflowExecutionId?: string,
  ): Promise<void> {
    const where: any = { tenantId, status: TaskStatus.PENDING };
    if (workflowExecutionId) where.workflowExecutionId = workflowExecutionId;

    const pendingTasks = await this.taskRepo.find({ where });

    for (const task of pendingTasks) {
      const isReady = await this.isTaskReady(task);
      if (isReady) {
        await this.taskRepo.update(task.id, { status: TaskStatus.READY });
        await this.queue.add(
          TaskManagerJobs.EXECUTE_TASK,
          { taskId: task.id },
          {
            jobId: `task:${task.id}:attempt:${task.attemptCount + 1}`,
            priority: task.priority,
          },
        );
        this.logger.log(`Enqueued ready task ${task.id}`);
      }
    }
  }

  async markComplete(
    taskId: string,
    output: Record<string, any>,
  ): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    await this.taskRepo.update(taskId, {
      status: TaskStatus.COMPLETED,
      output,
      completedAt: new Date(),
    });

    await this.attemptRepo.update(
      { taskId, status: 'running' },
      { status: 'succeeded', completedAt: new Date() },
    );

    if (task.workflowExecutionId) {
      await this.checkAndEnqueueReady(task.tenantId, task.workflowExecutionId);
    }
  }

  async markFailed(taskId: string, error: string): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    const policy = task.retryPolicy ?? DEFAULT_RETRY_POLICY;
    const shouldRetry = task.attemptCount < policy.maxAttempts;

    if (shouldRetry) {
      const delay = Math.min(
        policy.backoffMs *
          Math.pow(policy.backoffMultiplier, task.attemptCount),
        policy.maxBackoffMs,
      );

      await this.taskRepo.update(taskId, {
        status: TaskStatus.PENDING,
        attemptCount: task.attemptCount + 1,
        errorMessage: error,
      });

      await this.queue.add(
        TaskManagerJobs.EXECUTE_TASK,
        { taskId },
        { delay, priority: task.priority },
      );

      this.logger.warn(
        `Task ${taskId} failed, retry ${task.attemptCount + 1}/${policy.maxAttempts} in ${delay}ms`,
      );
    } else {
      await this.taskRepo.update(taskId, {
        status: TaskStatus.FAILED,
        errorMessage: error,
        completedAt: new Date(),
      });

      await this.attemptRepo.update(
        { taskId, status: 'running' },
        { status: 'failed', completedAt: new Date(), error },
      );

      this.logger.error(
        `Task ${taskId} permanently failed after ${task.attemptCount} attempts`,
      );
    }
  }

  async startAttempt(taskId: string): Promise<TaskAttempt> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    await this.taskRepo.update(taskId, {
      status: TaskStatus.RUNNING,
      startedAt: task.startedAt ?? new Date(),
      attemptCount: task.attemptCount + 1,
    });

    return this.attemptRepo.save(
      this.attemptRepo.create({
        taskId,
        attemptNumber: task.attemptCount + 1,
        status: 'running',
      }),
    );
  }

  async getTask(id: string, tenantId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id, tenantId } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async listTasks(
    tenantId: string,
    workflowExecutionId?: string,
  ): Promise<Task[]> {
    const where: any = { tenantId };
    if (workflowExecutionId) where.workflowExecutionId = workflowExecutionId;
    return this.taskRepo.find({
      where,
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    return this.depRepo.find({ where: { dependentTaskId: taskId } });
  }

  async getAttempts(taskId: string): Promise<TaskAttempt[]> {
    return this.attemptRepo.find({
      where: { taskId },
      order: { attemptNumber: 'ASC' },
    });
  }

  private async isTaskReady(task: Task): Promise<boolean> {
    const deps = await this.depRepo.find({
      where: { dependentTaskId: task.id },
    });
    if (deps.length === 0) return true;

    const dependsOnIds = deps.map((d) => d.dependsOnTaskId);
    const depTasks = await this.taskRepo.find({
      where: { id: In(dependsOnIds) },
    });
    const depMap = new Map(depTasks.map((t) => [t.id, t]));

    for (const dep of deps) {
      const depTask = depMap.get(dep.dependsOnTaskId);
      if (!depTask) return false;

      if (dep.dependencyType === DependencyType.COMPLETION) {
        if (
          ![
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
            TaskStatus.CANCELLED,
          ].includes(depTask.status)
        )
          return false;
      } else {
        if (depTask.status !== TaskStatus.COMPLETED) return false;
      }
    }

    return true;
  }

  private async detectCycle(
    taskId: string,
    dependsOnId: string,
  ): Promise<void> {
    const visited = new Set<string>([taskId]);
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        throw new BadRequestException(`Adding dependency would create a cycle`);
      }
      visited.add(current);

      const upstreamDeps = await this.depRepo.find({
        where: { dependentTaskId: current },
      });
      queue.push(...upstreamDeps.map((d) => d.dependsOnTaskId));
    }
  }
}
