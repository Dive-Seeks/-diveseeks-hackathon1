import { Injectable } from '@nestjs/common';
import { TaskSession } from '../entities/task-session.entity';
import { HermesAgentService } from '../../hermes-agent';
import type {
  SpecialistExecutor,
  SpecialistRunInput,
  SpecialistRunResult,
} from './specialist-executor.types';

@Injectable()
export class HermesAgentSpecialistExecutor implements SpecialistExecutor {
  constructor(private readonly hermes: HermesAgentService) {}

  async run(input: SpecialistRunInput): Promise<SpecialistRunResult> {
    const started = Date.now();
    const task = this.getTaskText(input.session);
    const prompt = [
      `You are the ${input.specialist} specialist on the ${input.team} team.`,
      'Complete the following task and return your full work product as the answer.',
      '',
      task,
    ].join('\n');

    try {
      const result = await this.hermes.runTask({
        tenantId: input.tenantId,
        userId: input.userId,
        prompt,
      });
      if (!result.trim()) {
        return this.fail(started, 'hermes_empty_output');
      }
      return {
        result,
        report: {
          taskOutcome: 'pass',
          duration: Date.now() - started,
          errorPatterns: [],
          executorBackend: 'hermes',
        },
      };
    } catch {
      return this.fail(started, 'hermes_unavailable');
    }
  }

  private fail(started: number, pattern: string): SpecialistRunResult {
    return {
      result: '',
      report: {
        taskOutcome: 'fail',
        duration: Date.now() - started,
        errorPatterns: [pattern],
        executorBackend: 'hermes',
      },
    };
  }

  private getTaskText(session: TaskSession): string {
    const taskSession = session as TaskSession & {
      taskDescription?: string;
      description?: string;
    };
    return taskSession.taskDescription ?? taskSession.description ?? '';
  }
}
