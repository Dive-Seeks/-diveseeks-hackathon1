import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentSessionsService } from '../abigail/agent-sessions.service';
import { BaseManagerService } from './base-manager.service';

@Controller('managers')
@UseGuards(JwtAuthGuard)
export class ManagersController {
  private readonly logger = new Logger(ManagersController.name);

  constructor(
    private readonly sessions: AgentSessionsService,
    private readonly baseManager: BaseManagerService,
  ) {}

  @Post('review/:sessionId')
  async triggerReview(@Param('sessionId') sessionId: string, @Req() req: any) {
    const session = await this.sessions.findOne(sessionId, req.user.tenantId);
    if (!session)
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    if (!session.pendingApproval) {
      throw new HttpException(
        'No pending output to review',
        HttpStatus.BAD_REQUEST,
      );
    }

    const decision = await this.baseManager.review(
      session.domain,
      session.pendingApproval,
      `Review output for domain: ${session.domain}`,
    );

    if (decision.decision === 'approve') {
      await this.sessions.patch(sessionId, req.user.tenantId, {
        status: 'waiting_approval',
      });
    } else if (decision.decision === 'reject') {
      await this.sessions.patch(sessionId, req.user.tenantId, {
        status: 'running',
        lastRejection: {
          reason: decision.reasoning,
          instructions: decision.revisionInstructions,
          constraints: decision.constraintsToAdd,
        },
      });
    } else {
      // revision_requested
      await this.sessions.patch(sessionId, req.user.tenantId, {
        status: 'running',
        lastRejection: {
          reason: decision.reasoning,
          instructions: decision.revisionInstructions,
          constraints: decision.constraintsToAdd,
        },
      });
    }

    return { success: true, decision };
  }
}
