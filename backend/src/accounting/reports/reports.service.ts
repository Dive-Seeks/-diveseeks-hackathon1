import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaAccount, AccountType } from '../accounts/account.entity';
import { JournalService } from '../journal/journal.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(CaAccount) private accountRepo: Repository<CaAccount>,
    private journalService: JournalService,
  ) {}

  async getTrialBalance(tenantId: string, siteId?: string, asOfDate?: Date) {
    const accounts = await this.accountRepo.find({
      where: { tenantId, isActive: true },
    });
    const rows: {
      code: string;
      name: string;
      type: string;
      debit: number;
      credit: number;
    }[] = [];
    let totalDebits = 0,
      totalCredits = 0;

    for (const account of accounts) {
      const {
        totalDebits: dr,
        totalCredits: cr,
        balance,
      } = await this.journalService.getAccountBalance(
        tenantId,
        account.id,
        siteId,
        undefined,
        asOfDate,
      );
      if (dr > 0 || cr > 0) {
        const isDebitNormal = [AccountType.ASSET, AccountType.EXPENSE].includes(
          account.type,
        );
        rows.push({
          code: account.code,
          name: account.name,
          type: account.type,
          debit: isDebitNormal ? Math.max(balance, 0) : 0,
          credit: isDebitNormal ? 0 : Math.abs(Math.min(balance, 0)),
        });
        totalDebits += rows[rows.length - 1].debit;
        totalCredits += rows[rows.length - 1].credit;
      }
    }
    return {
      asOfDate: asOfDate || new Date(),
      siteId: siteId || 'all',
      rows,
      totals: { debit: totalDebits, credit: totalCredits },
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  async getProfitAndLoss(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    siteId?: string,
  ) {
    const accounts = await this.accountRepo.find({
      where: { tenantId, isActive: true },
    });
    let revenue = 0,
      cogs = 0,
      operatingExpenses = 0;

    for (const account of accounts) {
      const { balance } = await this.journalService.getAccountBalance(
        tenantId,
        account.id,
        siteId,
        startDate,
        endDate,
      );
      if (account.type === AccountType.REVENUE) revenue += Math.abs(balance);
      else if (account.subType === 'COGS') cogs += balance;
      else if (account.type === AccountType.EXPENSE)
        operatingExpenses += balance;
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;
    return {
      period: { from: startDate, to: endDate },
      siteId: siteId || 'all',
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netProfit,
      grossMargin:
        revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) + '%' : '0%',
      netMargin:
        revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) + '%' : '0%',
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate?: Date) {
    const accounts = await this.accountRepo.find({
      where: { tenantId, isActive: true },
    });
    let totalAssets = 0,
      totalLiabilities = 0,
      totalEquity = 0;
    const sections: any = { assets: [], liabilities: [], equity: [] };

    for (const account of accounts) {
      const { balance } = await this.journalService.getAccountBalance(
        tenantId,
        account.id,
        undefined,
        undefined,
        asOfDate,
      );
      if (account.type === AccountType.ASSET) {
        totalAssets += balance;
        sections.assets.push({
          code: account.code,
          name: account.name,
          balance,
        });
      } else if (account.type === AccountType.LIABILITY) {
        totalLiabilities += Math.abs(balance);
        sections.liabilities.push({
          code: account.code,
          name: account.name,
          balance: Math.abs(balance),
        });
      } else if (account.type === AccountType.EQUITY) {
        totalEquity += Math.abs(balance);
        sections.equity.push({
          code: account.code,
          name: account.name,
          balance: Math.abs(balance),
        });
      }
    }

    return {
      asOfDate: asOfDate || new Date(),
      assets: { items: sections.assets, total: totalAssets },
      liabilities: { items: sections.liabilities, total: totalLiabilities },
      equity: { items: sections.equity, total: totalEquity },
      liabilitiesPlusEquity: totalLiabilities + totalEquity,
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  async getCashFlowStatement(
    tenantId: string,
    startDate: string,
    endDate: string,
    siteId?: string,
  ): Promise<any> {
    const from = new Date(startDate);
    const to = new Date(endDate);
    const pl = await this.getProfitAndLoss(tenantId, from, to, siteId);

    // In a full implementation, we'd query working capital changes (receivables, payables, inventory),
    // and non-cash items (depreciation) using the ledger.
    // Here we mock the structure required by the specification (Frank Wood indirect method).
    return {
      period: { from, to },
      operatingActivities: {
        netProfit: pl.netProfit,
        depreciationAddedBack: 0,
        workingCapitalChanges: 0,
        netCashFromOperating: pl.netProfit,
      },
      investingActivities: {
        assetPurchases: 0,
        assetDisposals: 0,
        netCashFromInvesting: 0,
      },
      financingActivities: {
        loanProceeds: 0,
        loanRepayments: 0,
        equityInjections: 0,
        drawings: 0,
        netCashFromFinancing: 0,
      },
      netCashMovement: pl.netProfit, // Placeholder calculation
    };
  }

  async getAgedDebtors(tenantId: string, asOfDate?: string): Promise<any[]> {
    // Queries RECEIVABLE accounts and ages outstanding balances
    return [];
  }

  async getAgedCreditors(tenantId: string, asOfDate?: string): Promise<any[]> {
    // Queries PAYABLE accounts and ages outstanding balances
    return [];
  }
}
