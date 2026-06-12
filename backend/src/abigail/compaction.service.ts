import { Injectable, Logger } from '@nestjs/common';
import { HeartbeatService } from '../heartbeat/heartbeat.service';

@Injectable()
export class CompactionService {
  private readonly logger = new Logger(CompactionService.name);

  constructor(private readonly heartbeat: HeartbeatService) {}

  async compactSession(
    sessionContext: string,
    lastOutput: string,
  ): Promise<string> {
    this.logger.log('Compacting session');
    return this.heartbeat.compact(sessionContext, lastOutput);
  }
}
