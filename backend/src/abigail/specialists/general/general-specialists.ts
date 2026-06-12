import { Injectable } from '@nestjs/common';
import { BaseSpecialist } from '../specialists';
import { GENERAL_SPECIALIST_PROMPTS } from './general-specialist-prompts';
import { Context7Service } from '../../../mcp/context7.service';
import { HeartbeatService } from '../../../heartbeat/heartbeat.service';
import { PromptVersionService } from '../../../evolve/prompt-version.service';
import { CodingSpecialistBootstrapService } from '../coding-specialist-bootstrap.service';

export abstract class GeneralBaseSpecialist extends BaseSpecialist {
  protected getDefaultPrompt(): string {
    return (
      GENERAL_SPECIALIST_PROMPTS[this.id] ?? `You are ${this.id}, a specialist.`
    );
  }
}

@Injectable()
export class EchoSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('echo', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class LyraSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('lyra', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class SparkSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('spark', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class ZoeSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('zoe', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class GistSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('gist', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class MemoSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('memo', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class TranSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('tran', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class PlanSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('plan', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class VibeSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('vibe', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class QuestSpecialist extends GeneralBaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('quest', c7, heartbeat, pv, bootstrap);
  }
}
