import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../email/email.service';

interface SetupStartedPayload {
  userId: string;
  timestamp: string;
}

interface StepCompletedPayload {
  step: string;
  businessId: string;
}

interface SetupCompletedPayload {
  businessId: string;
}

@Injectable()
export class SetupBusinessListener {
  private readonly logger = new Logger(SetupBusinessListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent('business.setup.started')
  handleSetupStarted(payload: SetupStartedPayload) {
    this.logger.log(
      `[MONITORING] Business setup started for user ${payload.userId} at ${payload.timestamp}`,
    );
    // Simulate external integration (e.g., CRM lead creation)
    this.logger.log(
      `[EXTERNAL] Notifying CRM about new setup for user ${payload.userId}`,
    );
  }

  @OnEvent('business.setup.step_completed')
  handleStepCompleted(payload: StepCompletedPayload) {
    this.logger.log(
      `[MONITORING] Step ${payload.step} completed for business ${payload.businessId}`,
    );
    // Optional: track progress in analytics service
    this.logger.log(
      `[ANALYTICS] Tracking progress: business ${payload.businessId} reached step ${payload.step}`,
    );
  }

  @OnEvent('business.setup.completed')
  handleSetupCompleted(payload: SetupCompletedPayload) {
    this.logger.log(
      `[MONITORING] Business setup completed for business ${payload.businessId}`,
    );

    // Trigger post-setup actions:
    // 1. Send welcome email
    try {
      // In a real scenario, we'd fetch the user's email from the business object
      // For this implementation, we'll log the attempt
      this.logger.log(
        `[EMAIL] Attempting to send welcome email for business ${payload.businessId}`,
      );
      // await this.emailService.sendEmail('user@example.com', 'Welcome to Dive POS!', 'welcome', { businessId: payload.businessId });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }

    // 2. Notify Ops team
    this.logger.log(
      `[EXTERNAL] Notifying Operations Team about new ACTIVE business: ${payload.businessId}`,
    );
  }
}
