import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { TeamRegistryService } from '../registries/team-registry.service';
import { FlagRegistryService } from '../registries/flag-registry.service';
import { EvaluatorRegistryService } from '../registries/evaluator-registry.service';
import { IEvidenceEvaluator } from '../interfaces/evidence-evaluator.interface';

const CODING_FLAGS = [
  {
    flagKey: 'requiresFileChange',
    description: 'Git diff shows expected file(s) changed',
    evaluatorId: 'file-change-evaluator',
  },
  {
    flagKey: 'requiresTestPass',
    description: 'Jest test file passes',
    evaluatorId: 'test-pass-evaluator',
  },
  {
    flagKey: 'requiresHurlGreen',
    description: 'Hurl file returns 2xx + assertions green',
    evaluatorId: 'hurl-pass-evaluator',
  },
  {
    flagKey: 'requiresKaiApproval',
    description: 'Kai review returns no blocking comments',
    evaluatorId: 'kai-approval-evaluator',
  },
  {
    flagKey: 'requiresTypecheckPass',
    description: 'tsc --noEmit exits 0',
    evaluatorId: 'typecheck-evaluator',
  },
  {
    flagKey: 'requiresLintPass',
    description: 'ESLint exits 0',
    evaluatorId: 'lint-evaluator',
  },
  {
    flagKey: 'requiresCdpWatch',
    description: 'CDP DOM subscription matches expected events',
    evaluatorId: 'dom-watcher-evaluator',
  },
  {
    flagKey: 'requiresAttrWatch',
    description: 'MutationObserver bridge confirms attribute change',
    evaluatorId: 'dom-watcher-evaluator',
  },
  {
    flagKey: 'requiresNetworkAssert',
    description: 'page.route intercept matches response',
    evaluatorId: 'dom-watcher-evaluator',
  },
  {
    flagKey: 'requiresSecurityClean',
    description: 'Felix scan returns no high-severity findings',
    evaluatorId: 'security-scan-evaluator',
  },
  {
    flagKey: 'requiresHumanReview',
    description: 'Human approves via REVIEW CARD',
    evaluatorId: 'human-code-review-evaluator',
  },
];

const DEFAULT_FLAGS = [
  'requiresFileChange',
  'requiresTestPass',
  'requiresKaiApproval',
];

@Injectable()
export class CodingTeamBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly teamRegistry: TeamRegistryService,
    private readonly flagRegistry: FlagRegistryService,
    private readonly evaluatorRegistry: EvaluatorRegistryService,
    @Inject('FileChangeEvaluatorService')
    private readonly fileChange: IEvidenceEvaluator,
    @Inject('TestPassEvaluatorService')
    private readonly testPass: IEvidenceEvaluator,
    @Inject('HurlPassEvaluatorService')
    private readonly hurlPass: IEvidenceEvaluator,
    @Inject('KaiApprovalEvaluatorService')
    private readonly kaiApproval: IEvidenceEvaluator,
    @Inject('TypecheckEvaluatorService')
    private readonly typecheck: IEvidenceEvaluator,
    @Inject('LintEvaluatorService') private readonly lint: IEvidenceEvaluator,
    @Inject('DomWatcherEvaluatorService')
    private readonly domWatcher: IEvidenceEvaluator,
    @Inject('VisionConstraintEvaluatorService')
    private readonly visionConstraint: IEvidenceEvaluator,
    @Inject('SecurityScanEvaluatorService')
    private readonly securityScan: IEvidenceEvaluator,
    @Inject('HumanCodeReviewEvaluatorService')
    private readonly humanReview: IEvidenceEvaluator,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.teamRegistry.registerTeam({
      teamName: 'coding',
      displayName: 'Coding',
      defaultFlags: DEFAULT_FLAGS,
      maxIterations: 5,
      iterationTimeoutSeconds: 180,
    });

    const evaluators = [
      this.fileChange,
      this.testPass,
      this.hurlPass,
      this.kaiApproval,
      this.typecheck,
      this.lint,
      this.domWatcher,
      this.visionConstraint,
      this.securityScan,
      this.humanReview,
    ];
    for (const e of evaluators) {
      try {
        this.evaluatorRegistry.register(e);
      } catch {
        // duplicate registration on hot-reload — safe to ignore
      }
    }

    for (const flag of CODING_FLAGS) {
      await this.flagRegistry.registerFlag({
        flagKey: flag.flagKey,
        team: 'coding',
        description: flag.description,
        evidenceShape: {},
        evaluatorId: flag.evaluatorId,
      });
    }
  }
}
