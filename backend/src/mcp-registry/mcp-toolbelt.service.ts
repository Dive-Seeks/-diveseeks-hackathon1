import { Injectable } from '@nestjs/common';
import {
  SpecialistId,
  McpServerRegistration,
} from './entities/mcp-server-registration.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class McpToolbeltService {
  constructor(
    @InjectRepository(McpServerRegistration)
    private readonly repo: Repository<McpServerRegistration>,
  ) {}

  async getToolbeltForSpecialist(
    specialistId: SpecialistId,
    teamId: string,
  ): Promise<McpServerRegistration[]> {
    const allServers = await this.repo.find({
      where: { teamId, status: 'active' },
    });

    return allServers.filter((server) => {
      // Hard Rule: Coordination MCPs (assigned to 'chatbox') are NEVER injected into specialists
      if (server.assignedTo === 'chatbox') return false;

      if (server.assignedTo === 'all') return true;
      if (
        Array.isArray(server.assignedTo) &&
        server.assignedTo.includes(specialistId)
      )
        return true;

      return false;
    });
  }

  async getChatboxTools(teamId: string): Promise<McpServerRegistration[]> {
    const allServers = await this.repo.find({
      where: { teamId, status: 'active' },
    });

    return allServers.filter((server) => {
      return server.assignedTo === 'chatbox' || server.assignedTo === 'all';
    });
  }
}
