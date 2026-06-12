import { Injectable } from '@nestjs/common';
import { BrainSessionService } from './brain-session.service';

@Injectable()
export class BrainDispatchGuardService {
  constructor(private readonly sessionService: BrainSessionService) {}

  async check(
    tenantId: string,
    userId: string,
  ): Promise<{ held: boolean; sessionId?: string }> {
    const activeSession = await this.sessionService.getActive(tenantId, userId);
    if (activeSession) {
      return { held: true, sessionId: activeSession.id };
    }
    return { held: false };
  }
}
