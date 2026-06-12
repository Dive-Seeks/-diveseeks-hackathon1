import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamRegistration } from '../entities/team-registration.entity';

export interface RegisterTeamInput {
  teamName: string;
  displayName: string;
  defaultFlags: string[];
  maxIterations: number;
  iterationTimeoutSeconds: number;
}

@Injectable()
export class TeamRegistryService {
  private readonly logger = new Logger(TeamRegistryService.name);

  constructor(
    @InjectRepository(TeamRegistration)
    private readonly repo: Repository<TeamRegistration>,
  ) {}

  async registerTeam(input: RegisterTeamInput): Promise<TeamRegistration> {
    const existing = await this.repo.findOne({
      where: { teamName: input.teamName },
    });
    const row = existing ?? this.repo.create();
    Object.assign(row, input);
    const saved = await this.repo.save(row);
    this.logger.log(
      `Registered team: ${input.teamName} (${input.defaultFlags.length} default flags)`,
    );
    return saved;
  }

  async getDefaultFlags(teamName: string): Promise<string[]> {
    const row = await this.repo.findOne({ where: { teamName } });
    if (!row)
      throw new NotFoundException(`Team '${teamName}' is not registered`);
    return row.defaultFlags;
  }

  async getMaxIterations(teamName: string): Promise<number> {
    const row = await this.repo.findOne({ where: { teamName } });
    if (!row)
      throw new NotFoundException(`Team '${teamName}' is not registered`);
    return row.maxIterations;
  }

  async getIterationTimeoutSeconds(teamName: string): Promise<number> {
    const row = await this.repo.findOne({ where: { teamName } });
    if (!row)
      throw new NotFoundException(`Team '${teamName}' is not registered`);
    return row.iterationTimeoutSeconds;
  }

  async listTeams(): Promise<TeamRegistration[]> {
    return this.repo.find();
  }
}
