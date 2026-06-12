import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('night-team')
export class NightTeamProcessor extends WorkerHost {
  private readonly logger = new Logger(NightTeamProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing night team job: ${job.name}`);
    // Here we would route to the respective agent service
    return { success: true };
  }
}
