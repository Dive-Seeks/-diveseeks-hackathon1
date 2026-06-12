import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { TeamRegistryService } from '../registries/team-registry.service';
import { FlagRegistryService } from '../registries/flag-registry.service';
import { EvaluatorRegistryService } from '../registries/evaluator-registry.service';
import { IEvidenceEvaluator } from '../interfaces/evidence-evaluator.interface';

const GENERAL_FLAGS = [
  {
    flagKey: 'requiresLengthRange',
    description: 'Word count within [min, max]',
    evaluatorId: 'length-range-evaluator',
  },
  {
    flagKey: 'requiresStructuredFormat',
    description: 'Output parses as valid JSON/Markdown/etc',
    evaluatorId: 'structured-format-evaluator',
  },
  {
    flagKey: 'requiresCitations',
    description: 'N citation markers, each resolves to real URL',
    evaluatorId: 'citations-evaluator',
  },
  {
    flagKey: 'requiresFactCheck',
    description: 'Claims cross-check against knowledge base',
    evaluatorId: 'factcheck-evaluator',
  },
  {
    flagKey: 'requiresTone',
    description: 'Output matches requested tone',
    evaluatorId: 'tone-evaluator',
  },
  {
    flagKey: 'requiresCoverage',
    description: 'All required topics from PRD addressed',
    evaluatorId: 'coverage-evaluator',
  },
  {
    flagKey: 'requiresHumanApproval',
    description: 'Human approves via REVIEW CARD',
    evaluatorId: 'human-text-approval-evaluator',
  },
  {
    flagKey: 'requiresNoHallucination',
    description: 'Factual claims trace to knowledge',
    evaluatorId: 'no-hallucination-evaluator',
  },
];

const DEFAULT_FLAGS = ['requiresCoverage', 'requiresStructuredFormat'];

@Injectable()
export class GeneralTeamBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly teamRegistry: TeamRegistryService,
    private readonly flagRegistry: FlagRegistryService,
    private readonly evaluatorRegistry: EvaluatorRegistryService,
    @Inject('LengthRangeEvaluatorService')
    private readonly lengthRange: IEvidenceEvaluator,
    @Inject('StructuredFormatEvaluatorService')
    private readonly structuredFormat: IEvidenceEvaluator,
    @Inject('CitationsEvaluatorService')
    private readonly citations: IEvidenceEvaluator,
    @Inject('FactcheckEvaluatorService')
    private readonly factcheck: IEvidenceEvaluator,
    @Inject('ToneEvaluatorService') private readonly tone: IEvidenceEvaluator,
    @Inject('CoverageEvaluatorService')
    private readonly coverage: IEvidenceEvaluator,
    @Inject('HumanTextApprovalEvaluatorService')
    private readonly humanTextApproval: IEvidenceEvaluator,
    @Inject('NoHallucinationEvaluatorService')
    private readonly noHallucination: IEvidenceEvaluator,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.teamRegistry.registerTeam({
      teamName: 'general',
      displayName: 'General',
      defaultFlags: DEFAULT_FLAGS,
      maxIterations: 3,
      iterationTimeoutSeconds: 600,
    });

    const evaluators = [
      this.lengthRange,
      this.structuredFormat,
      this.citations,
      this.factcheck,
      this.tone,
      this.coverage,
      this.humanTextApproval,
      this.noHallucination,
    ];
    for (const e of evaluators) {
      try {
        this.evaluatorRegistry.register(e);
      } catch {
        // duplicate on hot-reload
      }
    }

    for (const flag of GENERAL_FLAGS) {
      await this.flagRegistry.registerFlag({
        flagKey: flag.flagKey,
        team: 'general',
        description: flag.description,
        evidenceShape: {},
        evaluatorId: flag.evaluatorId,
      });
    }
  }
}
