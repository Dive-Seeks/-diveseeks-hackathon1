import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailProcessor } from './processors/email.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email_queue',
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService, BullModule],
})
export class EmailModule {}
