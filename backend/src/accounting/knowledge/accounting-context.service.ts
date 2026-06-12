import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingKnowledge } from './accounting-knowledge.entity';
import {
  AccountingContext,
  JournalPattern,
  ReconciliationRule,
  AccountingPolicy,
} from '../../memory/tenant-context.schema';

@Injectable()
export class AccountingContextService {
  constructor(
    @InjectRepository(AccountingKnowledge)
    private readonly knowledgeRepo: Repository<AccountingKnowledge>,
  ) {}

  async buildAccountingContext(opts: {
    tenantId: string;
    jurisdiction: string;
    baseCurrency: string;
    vatScheme: string;
    businessType: string;
  }): Promise<AccountingContext> {
    const { jurisdiction, baseCurrency, vatScheme, businessType } = opts;

    // Load universal rules + businessType-specific rules — no jurisdiction filter
    const rules = await this.knowledgeRepo.find({
      where: [
        { businessType: '*', active: true },
        { businessType, active: true },
      ],
      order: { confidence: 'DESC' },
    });

    return {
      jurisdiction,
      baseCurrency,
      vatScheme,
      businessType,
      canonicalJournalPatterns: rules
        .filter((r) => r.ruleType === 'journal_pattern')
        .map((r) => r.ruleData as JournalPattern),
      reconciliationRules: rules
        .filter((r) => r.ruleType === 'reconciliation_rule')
        .map((r) => r.ruleData as ReconciliationRule),
      accountingPolicies: rules
        .filter((r) => r.ruleType === 'policy')
        .map((r) => r.ruleData as AccountingPolicy),
      electedPolicies: [],
      knownAnomalies: [],
      openAccountingQuestions: [],
      lastReviewedAt: new Date().toISOString(),
    };
  }

  updateFromSession(felixOutput: {
    anomaliesDetected?: string[];
    openQuestions?: string[];
    electedPolicies?: Array<{ policy: string; elected: string }>;
  }): Partial<AccountingContext> {
    return {
      knownAnomalies: felixOutput.anomaliesDetected ?? [],
      openAccountingQuestions: felixOutput.openQuestions ?? [],
      electedPolicies: felixOutput.electedPolicies ?? [],
      lastReviewedAt: new Date().toISOString(),
    };
  }
}
