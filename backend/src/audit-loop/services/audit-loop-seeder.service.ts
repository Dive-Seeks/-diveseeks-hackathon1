import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PromptTemplate } from '../../prompt-engine/entities/prompt-template.entity';
import { AuditRubric } from '../entities/audit-loop.entity';

@Injectable()
export class AuditLoopSeederService implements OnModuleInit {
  private readonly logger = new Logger(AuditLoopSeederService.name);

  constructor(
    @InjectRepository(PromptTemplate)
    private readonly promptRepo: Repository<PromptTemplate>,
    @InjectRepository(AuditRubric)
    private readonly rubricRepo: Repository<AuditRubric>,
  ) {}

  async onModuleInit() {
    await this.seedPrompts();
    await this.seedRubrics();
  }

  private async seedPrompts() {
    const prompts = [
      {
        name: 'abigail-brainstorm-plan',
        version: 1,
        description: 'Brainstorm a detailed execution plan for a user request.',
        template:
          'User Request: {{request}}\n\nBrainstorm at least 3 approaches and then select the best one. For the selected one, provide a detailed step-by-step plan including required tools and potential edge cases.\n\nOutput format:\n{\n  "analysis": "...",\n  "approaches": ["...", "...", "..."],\n  "selectedApproach": "...",\n  "plan": "Step-by-step detail..."\n}',
        inputVariables: ['request'],
        isActive: true,
      },
      {
        name: 'abigail-plan-to-workflow',
        version: 1,
        description: 'Convert a text plan into a YAML workflow DAG.',
        template:
          'Plan: {{plan}}\nRound: {{round}}\n\nConvert this plan into a valid YAML DAG for the workflow engine. Each step must have a key, promptTemplateName, specialistId, and optional dependsOn[].\n\nOutput YAML format:\nname: workflow-{{round}}\nsteps:\n  - key: step-1\n    specialistId: rex\n    promptTemplateName: abigail-brainstorm-plan\n    dependsOn: []\n  - key: step-2\n    specialistId: nova\n    promptTemplateName: abigail-brainstorm-plan\n    dependsOn: [step-1]\n',
        inputVariables: ['plan', 'round'],
        isActive: true,
      },
    ];

    for (const p of prompts) {
      const exists = await this.promptRepo.findOne({
        where: { name: p.name, tenantId: IsNull() },
      });
      if (!exists) {
        await this.promptRepo.save(this.promptRepo.create(p));
        this.logger.log(`Seeded prompt template: ${p.name}`);
      }
    }
  }

  private async seedRubrics() {
    const rubrics = [
      {
        phase: 'plan_audit',
        version: 1,
        criteria: [
          {
            name: 'completeness',
            description: 'Does the plan address all parts of the request?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'vision-alignment',
            description: 'Alignment with long-term goals.',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'constraint-satisfaction',
            description: 'Are all technical/business constraints met?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'risk-coverage',
            description: 'Are potential failures mitigated?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'success-criteria-clarity',
            description: 'Are success metrics measurable?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'dependency-ordering',
            description: 'Is the sequence logical?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'scope-boundedness',
            description: 'Is the scope clear and limited?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'cost-estimate',
            description: 'Resource/token efficiency.',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'parallelism-opportunity',
            description: 'Can steps run in parallel?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'evolvability',
            description: 'Can the plan be easily adjusted?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
        ],
        isActive: true,
      },
      {
        phase: 'workflow_audit',
        version: 1,
        criteria: [
          {
            name: 'dag-validity',
            description: 'No cycles, reachable steps.',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'saga-coverage',
            description: 'Do all mutating steps have compensations?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'retry-soundness',
            description: 'Are retry policies realistic?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'timeout-realism',
            description: 'Are timeouts based on task complexity?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'parallelism-safety',
            description: 'Are concurrent steps thread-safe?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'resource-bounds',
            description: 'Does it stay within sandbox limits?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'observability-hooks',
            description: 'Does it emit useful events?',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
          {
            name: 'compensation-completeness',
            description: 'Full rollback capability.',
            weight: 1,
            scoringPrompt: 'Score 1-10',
          },
        ],
        isActive: true,
      },
      {
        phase: 'final_audit',
        version: 1,
        criteria: [
          {
            name: 'security',
            description:
              'Felix persona: No leaks, secrets, or vulnerabilities.',
            weight: 3,
            scoringPrompt: 'Score 0-10',
          },
          {
            name: 'test',
            description: 'Sage persona: Coverage, edge cases, error handling.',
            weight: 3,
            scoringPrompt: 'Score 0-10',
          },
          {
            name: 'quality',
            description: 'Kai persona: Clean code, vision alignment.',
            weight: 4,
            scoringPrompt: 'Score 0-10',
          },
        ],
        isActive: true,
      },
    ];

    for (const r of rubrics) {
      const exists = await this.rubricRepo.findOne({
        where: { phase: r.phase, tenantId: IsNull() },
      });
      if (exists) {
        // Update existing rubric criteria to match new hardening standards
        exists.criteria = r.criteria;
        await this.rubricRepo.save(exists);
        this.logger.log(`Updated audit rubric criteria for phase: ${r.phase}`);
      } else {
        await this.rubricRepo.save(this.rubricRepo.create(r));
        this.logger.log(`Seeded audit rubric for phase: ${r.phase}`);
      }
    }
  }
}
