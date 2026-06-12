import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class A2ARunnerService {
  constructor(@InjectQueue('a2a-runner') private readonly runnerQueue: Queue) {}

  async runTask(payload: any, tenantId: string): Promise<string> {
    const job = await this.runnerQueue.add(
      'execute-task',
      {
        ...payload,
        tenantId,
      },
      {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    return job.id!;
  }

  async getStatus(jobId: string): Promise<string> {
    const job = await this.runnerQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return await job.getState();
  }

  async getResult(jobId: string): Promise<any> {
    const job = await this.runnerQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const state = await job.getState();
    if (state !== 'completed') {
      return { status: state, progress: job.progress };
    }

    return job.returnvalue;
  }
}
