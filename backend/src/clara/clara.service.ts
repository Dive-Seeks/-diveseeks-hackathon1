import { Injectable, Logger } from '@nestjs/common';
import { CompanyService } from '../accounting/company/company.service';
import { ReportsService } from '../accounting/reports/reports.service';
import { AccountingManagerService } from '../managers/accounting-manager.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { streamText } from 'ai';
import { z } from 'zod';

export const ACCOUNTING_DISCLAIMER =
  '⚠️ AI-generated figures for informational purposes only. Always consult a qualified Chartered Accountant before filing with HMRC, IRS, GST authority, or any official tax body.';

export const FinancialReportSchema = z.object({
  reportType: z.enum(['pl', 'balance_sheet', 'trial_balance']),
  period: z.object({ from: z.string(), to: z.string() }).optional(),
  data: z.unknown(),
  isBalanced: z.boolean(),
  siteId: z.string().optional(),
  generatedAt: z.string(),
  disclaimer: z.literal(ACCOUNTING_DISCLAIMER),
});

export type FinancialReport = z.infer<typeof FinancialReportSchema>;

@Injectable()
export class ClaraService {
  private readonly logger = new Logger(ClaraService.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly reportsService: ReportsService,
    private readonly accountingManager: AccountingManagerService,
    private readonly providerRouter: AiProviderRouter,
  ) {}

  async runWeeklyReport(
    tenantId: string,
    siteId?: string,
  ): Promise<FinancialReport> {
    this.logger.log(
      `Clara: weekly report requested for tenant ${tenantId}, site ${siteId}`,
    );
    try {
      const company = await this.companyService.findByTenant(tenantId);
      if (!company)
        throw new Error(
          `No company profile found for tenant ${tenantId}. Set up accounting first.`,
        );

      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);

      const plData = await this.reportsService.getProfitAndLoss(
        tenantId,
        from,
        to,
        siteId,
      );
      const tbData = await this.reportsService.getTrialBalance(
        tenantId,
        siteId,
      );

      const report: FinancialReport = {
        reportType: 'pl',
        period: { from: from.toISOString(), to: to.toISOString() },
        data: plData,
        isBalanced: tbData.isBalanced,
        siteId: siteId || 'all',
        generatedAt: new Date().toISOString(),
        disclaimer: ACCOUNTING_DISCLAIMER,
      };

      const decision = await this.accountingManager.reviewFinancialReport(
        report,
        `Weekly P&L — ${from.toDateString()} to ${to.toDateString()}`,
      );

      if (decision.decision === 'reject') {
        throw new Error(
          `Accounting Manager rejected report: ${decision.reasoning}`,
        );
      }

      this.logger.log(
        `Clara: weekly report for tenant ${tenantId} approved (bypassed)`,
      );

      this.logger.log(
        `Clara: weekly report for tenant ${tenantId} approved by Accounting Manager`,
      );
      return report;
    } catch (err) {
      this.logger.error(
        `Clara: weekly report failed: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async runMonthlyReport(
    tenantId: string,
    siteId?: string,
  ): Promise<FinancialReport> {
    const company = await this.companyService.findByTenant(tenantId);
    if (!company)
      throw new Error(`No company profile found for tenant ${tenantId}.`);

    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);

    const [plData, bsData, tbData] = await Promise.all([
      this.reportsService.getProfitAndLoss(tenantId, from, to, siteId),
      this.reportsService.getBalanceSheet(tenantId, to),
      this.reportsService.getTrialBalance(tenantId, siteId, to),
    ]);

    const report: FinancialReport = {
      reportType: 'balance_sheet',
      period: { from: from.toISOString(), to: to.toISOString() },
      data: { pl: plData, balanceSheet: bsData, trialBalance: tbData },
      isBalanced: tbData.isBalanced && bsData.isBalanced,
      siteId: siteId || 'all',
      generatedAt: new Date().toISOString(),
      disclaimer: ACCOUNTING_DISCLAIMER,
    };

    const decision = await this.accountingManager.reviewFinancialReport(
      report,
      `Monthly Pack — ${from.toDateString()} to ${to.toDateString()}`,
    );

    if (decision.decision === 'reject') {
      throw new Error(
        `Accounting Manager rejected report: ${decision.reasoning}`,
      );
    }

    return report;
  }
}
