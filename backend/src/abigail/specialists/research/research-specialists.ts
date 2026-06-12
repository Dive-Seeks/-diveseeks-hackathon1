import { Injectable } from '@nestjs/common';
import { BaseSpecialist } from '../specialists';
import { RESEARCH_SPECIALIST_PROMPTS } from './research-specialist-prompts';
import { Context7Service } from '../../../mcp/context7.service';
import { HeartbeatService } from '../../../heartbeat/heartbeat.service';
import { PromptVersionService } from '../../../evolve/prompt-version.service';
import { CodingSpecialistBootstrapService } from '../coding-specialist-bootstrap.service';

export abstract class ResearchBaseSpecialist extends BaseSpecialist {
  protected getDefaultPrompt(): string {
    return (
      RESEARCH_SPECIALIST_PROMPTS[this.id] ??
      `You are ${this.id}, a research specialist.`
    );
  }
}

@Injectable()
export class LitSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('lit', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class CiteSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('cite', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class HypoSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('hypo', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class PeerSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('peer', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class ScribeSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('scribe', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class TutorSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('tutor', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class ProfSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('prof', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class GrantSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('grant', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class DataSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('data', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class SynthSpecialist extends ResearchBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('synth', c7, heartbeat, pv, bootstrap);
  }
}
