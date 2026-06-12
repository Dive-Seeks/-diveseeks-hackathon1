import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  HermesAgentInstance,
  HermesAgentInstanceStatus,
} from './entities/hermes-agent-instance.entity';

/** Read at call time — module-scope reads run before ConfigModule loads .env. */
function apiPort(): number {
  return Number(process.env.HERMES_AGENT_API_PORT) || 8642;
}

@Injectable()
export class HermesAgentInstanceService {
  constructor(
    @InjectRepository(HermesAgentInstance)
    private readonly repo: Repository<HermesAgentInstance>,
  ) {}

  async ensureRow(tenantId: string): Promise<HermesAgentInstance> {
    const existing = await this.repo.findOne({ where: { tenantId } });
    if (existing) {
      return existing;
    }

    const containerName = `hermes-agent-${tenantId}`;
    return this.repo.save({
      tenantId,
      containerName,
      endpoint: `http://${containerName}:${apiPort()}`,
      apiServerKey: randomBytes(32).toString('hex'),
      status: 'provisioning',
      lastUsedAt: null,
    });
  }

  async markStatus(
    tenantId: string,
    status: HermesAgentInstanceStatus,
  ): Promise<void> {
    await this.repo.update({ tenantId }, { status });
  }

  async touchLastUsed(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId }, { lastUsedAt: new Date() });
  }

  async getByTenant(tenantId: string): Promise<HermesAgentInstance | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  async setEnabled(tenantId: string, enabled: boolean): Promise<void> {
    const row = await this.ensureRow(tenantId);
    await this.repo.update({ tenantId: row.tenantId }, { enabled });
  }

  async findIdleRunning(idleMinutes: number): Promise<HermesAgentInstance[]> {
    const cutoff = new Date(Date.now() - idleMinutes * 60_000);
    return this.repo.find({
      where: { status: 'running', lastUsedAt: LessThan(cutoff) },
    });
  }
}
