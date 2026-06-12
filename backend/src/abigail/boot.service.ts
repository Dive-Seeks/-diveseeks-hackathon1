import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';
import { Agent } from '../agents/entities/agent.entity';

@Injectable()
export class BootService {
  private readonly logger = new Logger(BootService.name);

  constructor(private readonly agentsService: AgentsService) {}

  async bootTenant(tenantId: string): Promise<Agent> {
    // Idempotency check — return existing coordinator immediately
    const existing =
      await this.agentsService.findCoordinatorForTenant(tenantId);
    if (existing) {
      this.logger.log(
        `Coordinator already exists for tenant ${tenantId}: ${existing.id}`,
      );
      return existing;
    }

    // Find the global-ceo to wire the reporting chain
    const globalCeo = await this.agentsService.findGlobalCeo();
    if (!globalCeo) {
      throw new InternalServerErrorException(
        'Global CEO not found — platform seed may not have run',
      );
    }

    this.logger.log(
      `Seeding coordinator for tenant ${tenantId}, reporting to global-ceo ${globalCeo.id}`,
    );

    const coordinator = await this.agentsService.create({
      name: 'Abigail',
      role: 'coordinator',
      domain: 'coding',
      tenantId,
      reportsToId: globalCeo.id,
      budgetMonthlyCents: 500000,
    });

    this.logger.log(
      `Coordinator created: ${coordinator.id} for tenant ${tenantId}`,
    );
    return coordinator;
  }
}
