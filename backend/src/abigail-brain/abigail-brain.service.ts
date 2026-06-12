import { Injectable } from '@nestjs/common';
import { BrainSessionService } from './brain-session.service';
import { BrainIntentClassifierService } from './brain-intent-classifier.service';
import { BrainDispatchGuardService } from './brain-dispatch-guard.service';
import { BrainTechniqueService } from './brain-technique.service';

@Injectable()
export class AbigailBrainService {
  constructor(
    public readonly session: BrainSessionService,
    public readonly classifier: BrainIntentClassifierService,
    public readonly guard: BrainDispatchGuardService,
    public readonly technique: BrainTechniqueService,
  ) {}
}
