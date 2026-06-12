import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FlagRegistration } from '../entities/flag-registration.entity';

export interface RegisterFlagInput {
  flagKey: string;
  team: string;
  description: string;
  evidenceShape: Record<string, unknown>;
  evaluatorId: string;
}

@Injectable()
export class FlagRegistryService {
  private readonly logger = new Logger(FlagRegistryService.name);

  constructor(
    @InjectRepository(FlagRegistration)
    private readonly repo: Repository<FlagRegistration>,
  ) {}

  async registerFlag(input: RegisterFlagInput): Promise<FlagRegistration> {
    const existing = await this.repo.findOne({
      where: { flagKey: input.flagKey },
    });
    const row = existing ?? this.repo.create();
    Object.assign(row, input);
    try {
      const saved = await this.repo.save(row);
      this.logger.log(
        `Registered flag: ${input.flagKey} (team: ${input.team})`,
      );
      return saved;
    } catch (err: any) {
      // Race condition: another bootstrap service inserted the same flagKey concurrently
      if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
        const found = await this.repo.findOne({
          where: { flagKey: input.flagKey },
        });
        if (found) return found;
      }
      throw err;
    }
  }

  async getFlag(flagKey: string): Promise<FlagRegistration | null> {
    return this.repo.findOne({ where: { flagKey } });
  }

  async getFlagsForTeam(team: string): Promise<FlagRegistration[]> {
    return this.repo.find({ where: { team: In([team, 'all']) } });
  }

  async listAll(): Promise<FlagRegistration[]> {
    return this.repo.find();
  }
}
