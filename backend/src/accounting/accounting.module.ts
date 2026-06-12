import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CaCompany } from './company/company.entity';
import { CompanyService } from './company/company.service';
import { CompanyController } from './company/company.controller';

import { CaAccount } from './accounts/account.entity';
import { AccountsService } from './accounts/accounts.service';
import { AccountsController } from './accounts/accounts.controller';

import { CaJournalEntry } from './journal/journal-entry.entity';
import { CaJournalLine } from './journal/journal-line.entity';
import { JournalService } from './journal/journal.service';
import { JournalController } from './journal/journal.controller';

import { CaTaxRate } from './tax/tax-rate.entity';
import { TaxService } from './tax/tax.service';
import { TaxController } from './tax/tax.controller';

import { CaCurrency } from './currency/currency.entity';
import { CurrencyService } from './currency/currency.service';
import { CurrencyController } from './currency/currency.controller';

import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';

import { LedgerService } from './ledger/ledger.service';

import { AccountingKnowledge } from './knowledge/accounting-knowledge.entity';
import { AccountingContextService } from './knowledge/accounting-context.service';
import { AccountingKnowledgeController } from './knowledge/knowledge.controller';

import {
  CaBankReconciliation,
  CaBrsItem,
} from './reconciliation/bank-reconciliation.entity';
import { BankReconciliationService } from './reconciliation/bank-reconciliation.service';
import { BankReconciliationController } from './reconciliation/bank-reconciliation.controller';

import {
  CaDepreciationSchedule,
  CaDepreciationEntry,
} from './depreciation/depreciation-schedule.entity';
import { DepreciationService } from './depreciation/depreciation.service';
import { DepreciationController } from './depreciation/depreciation.controller';

import { CaContingentLiability } from './contingent/contingent-liability.entity';
import { ContingentLiabilityService } from './contingent/contingent-liability.service';
import { ContingentLiabilityController } from './contingent/contingent-liability.controller';

import { CaInventoryValuation } from './inventory/inventory-valuation.entity';
import { InventoryValuationService } from './inventory/inventory-valuation.service';
import { InventoryController } from './inventory/inventory.controller';

import { ErrorRectificationService } from './rectification/error-rectification.service';
import { RectificationController } from './rectification/rectification.controller';

import { ReconstructionService } from './reconstruction/reconstruction.service';
import { ReconstructionController } from './reconstruction/reconstruction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CaCompany,
      CaAccount,
      CaJournalEntry,
      CaJournalLine,
      CaTaxRate,
      CaCurrency,
      AccountingKnowledge,
      CaBankReconciliation,
      CaBrsItem,
      CaDepreciationSchedule,
      CaDepreciationEntry,
      CaContingentLiability,
      CaInventoryValuation,
    ]),
  ],
  controllers: [
    CompanyController,
    AccountsController,
    JournalController,
    ReportsController,
    CurrencyController,
    TaxController,
    BankReconciliationController,
    DepreciationController,
    AccountingKnowledgeController,
    ContingentLiabilityController,
    RectificationController,
    ReconstructionController,
    InventoryController,
  ],
  providers: [
    CompanyService,
    AccountsService,
    JournalService,
    TaxService,
    CurrencyService,
    ReportsService,
    LedgerService,
    AccountingContextService,
    BankReconciliationService,
    DepreciationService,
    ContingentLiabilityService,
    InventoryValuationService,
    ErrorRectificationService,
    ReconstructionService,
  ],
  exports: [
    CompanyService,
    AccountsService,
    JournalService,
    TaxService,
    CurrencyService,
    ReportsService,
    LedgerService,
    AccountingContextService,
    BankReconciliationService,
    DepreciationService,
    ContingentLiabilityService,
    InventoryValuationService,
    ErrorRectificationService,
    ReconstructionService,
  ],
})
export class AccountingModule {}
