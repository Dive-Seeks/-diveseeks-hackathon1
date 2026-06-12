import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { TeamRegistryService } from '../registries/team-registry.service';
import { FlagRegistryService } from '../registries/flag-registry.service';
import { EvaluatorRegistryService } from '../registries/evaluator-registry.service';
import { IEvidenceEvaluator } from '../interfaces/evidence-evaluator.interface';

const RESEARCH_FLAGS = [
  {
    flagKey: 'requiresDOI',
    description: 'Cited DOIs validate against Crossref',
    evaluatorId: 'doi-evaluator',
  },
  {
    flagKey: 'requiresPrimarySource',
    description: 'At least one source is primary literature',
    evaluatorId: 'primary-source-evaluator',
  },
  {
    flagKey: 'requiresPeerReviewed',
    description: 'Sources in peer-reviewed venues',
    evaluatorId: 'peer-reviewed-evaluator',
  },
  {
    flagKey: 'requiresReproducibleMethod',
    description: 'Method has enough detail to reproduce',
    evaluatorId: 'reproducible-method-evaluator',
  },
  {
    flagKey: 'requiresContradictionCheck',
    description: 'Claims dont contradict knowledge base',
    evaluatorId: 'contradiction-check-evaluator',
  },
  {
    flagKey: 'requiresDatasetCitation',
    description: 'Datasets cited with accessible identifier',
    evaluatorId: 'dataset-citation-evaluator',
  },
  {
    flagKey: 'requiresStatRigor',
    description: 'Quantitative claims have p/CI/effect size',
    evaluatorId: 'statistical-rigor-evaluator',
  },
  {
    flagKey: 'requiresPeerVerification',
    description: 'Peer research specialist reviews output',
    evaluatorId: 'peer-review-cycle-evaluator',
  },
  {
    flagKey: 'requiresRecency',
    description: 'Sources within configurable max age',
    evaluatorId: 'recency-evaluator',
  },
  {
    flagKey: 'requiresHumanApproval',
    description: 'Human approves via REVIEW CARD',
    evaluatorId: 'human-research-approval-evaluator',
  },
];

const DEFAULT_FLAGS = ['requiresPrimarySource', 'requiresContradictionCheck'];

@Injectable()
export class ResearchTeamBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly teamRegistry: TeamRegistryService,
    private readonly flagRegistry: FlagRegistryService,
    private readonly evaluatorRegistry: EvaluatorRegistryService,
    @Inject('DoiEvaluatorService') private readonly doi: IEvidenceEvaluator,
    @Inject('PrimarySourceEvaluatorService')
    private readonly primarySource: IEvidenceEvaluator,
    @Inject('PeerReviewedEvaluatorService')
    private readonly peerReviewed: IEvidenceEvaluator,
    @Inject('ReproducibleMethodEvaluatorService')
    private readonly reproducibleMethod: IEvidenceEvaluator,
    @Inject('ContradictionCheckEvaluatorService')
    private readonly contradictionCheck: IEvidenceEvaluator,
    @Inject('DatasetCitationEvaluatorService')
    private readonly datasetCitation: IEvidenceEvaluator,
    @Inject('StatisticalRigorEvaluatorService')
    private readonly statisticalRigor: IEvidenceEvaluator,
    @Inject('PeerReviewCycleEvaluatorService')
    private readonly peerReviewCycle: IEvidenceEvaluator,
    @Inject('RecencyEvaluatorService')
    private readonly recency: IEvidenceEvaluator,
    @Inject('HumanResearchApprovalEvaluatorService')
    private readonly humanResearchApproval: IEvidenceEvaluator,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.teamRegistry.registerTeam({
      teamName: 'research',
      displayName: 'Research',
      defaultFlags: DEFAULT_FLAGS,
      maxIterations: 8,
      iterationTimeoutSeconds: 240,
    });

    const evaluators = [
      this.doi,
      this.primarySource,
      this.peerReviewed,
      this.reproducibleMethod,
      this.contradictionCheck,
      this.datasetCitation,
      this.statisticalRigor,
      this.peerReviewCycle,
      this.recency,
      this.humanResearchApproval,
    ];
    for (const e of evaluators) {
      try {
        this.evaluatorRegistry.register(e);
      } catch {
        // duplicate on hot-reload
      }
    }

    for (const flag of RESEARCH_FLAGS) {
      await this.flagRegistry.registerFlag({
        flagKey: flag.flagKey,
        team: 'research',
        description: flag.description,
        evidenceShape: {},
        evaluatorId: flag.evaluatorId,
      });
    }
  }
}
