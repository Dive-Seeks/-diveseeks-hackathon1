import { Injectable } from '@nestjs/common';
import { CodingSpecialistFactory } from '../specialists/coding-specialist.factory';
import { SpecialistRegistryService } from '../specialists/specialist-registry.service';
import type {
  SpecialistExecutor,
  SpecialistRunInput,
  SpecialistRunResult,
} from './specialist-executor.types';

@Injectable()
export class LocalSpecialistExecutor implements SpecialistExecutor {
  constructor(
    private readonly specialistFactory: CodingSpecialistFactory,
    private readonly specialistRegistry: SpecialistRegistryService,
  ) {}

  async run(input: SpecialistRunInput): Promise<SpecialistRunResult> {
    const agent = input.isCoding
      ? this.specialistFactory.getSpecialist(input.specialist)
      : this.specialistRegistry.get(input.team, input.specialist);
    const result = (await agent.execute(
      input.session,
      input.runSessionId,
    )) as SpecialistRunResult;
    result.report.executorBackend ??= 'local';
    return result;
  }
}
