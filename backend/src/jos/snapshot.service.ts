import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { JosService } from './jos.service';

@Injectable()
export class SnapshotService {
  constructor(
    @Inject(forwardRef(() => JosService)) private readonly jos: JosService,
  ) {}

  async markApproved(tenantId: string, domain: string): Promise<void> {
    await this.jos.updateSnapshot(tenantId, domain, {
      status: 'healthy',
      score: '100',
      next_action: 'none',
    });
  }

  async markInProgress(
    tenantId: string,
    domain: string,
    nextAction: string,
  ): Promise<void> {
    await this.jos.updateSnapshot(tenantId, domain, {
      status: 'in_progress',
      next_action: nextAction,
    });
  }
}
