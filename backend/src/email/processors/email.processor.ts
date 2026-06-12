import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../email.service';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Processor('email_queue')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData, any, string>): Promise<any> {
    const { to, subject, template, context } = job.data;

    switch (job.name) {
      case 'send-email':
        await this.emailService.sendEmail(to, subject, template, context);
        break;
      default:
        console.warn(`Job name ${job.name} not supported`);
    }
  }
}
