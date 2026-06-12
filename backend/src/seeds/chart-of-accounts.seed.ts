import {
  AccountType,
  AccountSubType,
} from '../accounting/accounts/account.entity';

export const UNIVERSAL_CHART_OF_ACCOUNTS = [
  // ASSETS
  {
    code: '1000',
    name: 'Current Assets',
    type: AccountType.ASSET,
    subType: AccountSubType.CURRENT_ASSET,
  },
  {
    code: '1100',
    name: 'Cash at Bank',
    type: AccountType.ASSET,
    subType: AccountSubType.BANK,
    parentCode: '1000',
  },
  {
    code: '1110',
    name: 'Petty Cash',
    type: AccountType.ASSET,
    subType: AccountSubType.CASH,
    parentCode: '1000',
  },
  {
    code: '1200',
    name: 'Trade Debtors',
    type: AccountType.ASSET,
    subType: AccountSubType.RECEIVABLE,
    parentCode: '1000',
  },
  {
    code: '1300',
    name: 'Inventory / Stock',
    type: AccountType.ASSET,
    subType: AccountSubType.INVENTORY,
    parentCode: '1000',
  },
  {
    code: '1400',
    name: 'Prepaid Expenses',
    type: AccountType.ASSET,
    subType: AccountSubType.CURRENT_ASSET,
    parentCode: '1000',
  },
  {
    code: '1500',
    name: 'Fixed Assets',
    type: AccountType.ASSET,
    subType: AccountSubType.FIXED_ASSET,
  },
  {
    code: '1510',
    name: 'Equipment at Cost',
    type: AccountType.ASSET,
    subType: AccountSubType.FIXED_ASSET,
    parentCode: '1500',
  },
  {
    code: '1511',
    name: 'Accumulated Depreciation — Equipment',
    type: AccountType.ASSET,
    subType: AccountSubType.FIXED_ASSET,
    parentCode: '1500',
  },
  {
    code: '1520',
    name: 'Furniture at Cost',
    type: AccountType.ASSET,
    subType: AccountSubType.FIXED_ASSET,
    parentCode: '1500',
  },
  {
    code: '1521',
    name: 'Accumulated Depreciation — Furniture',
    type: AccountType.ASSET,
    subType: AccountSubType.FIXED_ASSET,
    parentCode: '1500',
  },

  // LIABILITIES
  {
    code: '2000',
    name: 'Current Liabilities',
    type: AccountType.LIABILITY,
    subType: AccountSubType.CURRENT_LIABILITY,
  },
  {
    code: '2100',
    name: 'Trade Creditors',
    type: AccountType.LIABILITY,
    subType: AccountSubType.PAYABLE,
    parentCode: '2000',
  },
  {
    code: '2200',
    name: 'Tax Control Account',
    type: AccountType.LIABILITY,
    subType: AccountSubType.TAX_PAYABLE,
    parentCode: '2000',
  },
  {
    code: '2210',
    name: 'VAT/GST Output',
    type: AccountType.LIABILITY,
    subType: AccountSubType.TAX_PAYABLE,
    parentCode: '2000',
  },
  {
    code: '2220',
    name: 'VAT/GST Input',
    type: AccountType.LIABILITY,
    subType: AccountSubType.TAX_PAYABLE,
    parentCode: '2000',
  },
  {
    code: '2300',
    name: 'Accrued Expenses',
    type: AccountType.LIABILITY,
    subType: AccountSubType.CURRENT_LIABILITY,
    parentCode: '2000',
  },
  {
    code: '2500',
    name: 'Long-term Liabilities',
    type: AccountType.LIABILITY,
    subType: AccountSubType.LONG_TERM_LIABILITY,
  },
  {
    code: '2510',
    name: 'Bank Loan',
    type: AccountType.LIABILITY,
    subType: AccountSubType.LONG_TERM_LIABILITY,
    parentCode: '2500',
  },

  // EQUITY
  {
    code: '3000',
    name: 'Capital / Share Capital',
    type: AccountType.EQUITY,
    subType: AccountSubType.SHARE_CAPITAL,
  },
  {
    code: '3100',
    name: 'Retained Earnings',
    type: AccountType.EQUITY,
    subType: AccountSubType.RETAINED_EARNINGS,
  },
  {
    code: '3200',
    name: 'Drawings',
    type: AccountType.EQUITY,
    subType: AccountSubType.DRAWINGS,
  },

  // REVENUE
  {
    code: '4000',
    name: 'Sales Revenue',
    type: AccountType.REVENUE,
    subType: AccountSubType.OPERATING_REVENUE,
  },
  {
    code: '4100',
    name: 'Other Income',
    type: AccountType.REVENUE,
    subType: AccountSubType.OTHER_INCOME,
  },
  {
    code: '4200',
    name: 'Delivery Income',
    type: AccountType.REVENUE,
    subType: AccountSubType.OPERATING_REVENUE,
  },

  // COGS
  {
    code: '5000',
    name: 'Cost of Sales / COGS',
    type: AccountType.EXPENSE,
    subType: AccountSubType.COGS,
  },
  {
    code: '5100',
    name: 'Stock Purchases',
    type: AccountType.EXPENSE,
    subType: AccountSubType.COGS,
  },

  // OPERATING EXPENSES
  {
    code: '6000',
    name: 'Rent',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6100',
    name: 'Utilities',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6200',
    name: 'Wages & Salaries',
    type: AccountType.EXPENSE,
    subType: AccountSubType.PAYROLL,
  },
  {
    code: '6300',
    name: 'Marketing & Advertising',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6400',
    name: 'Depreciation Expense',
    type: AccountType.EXPENSE,
    subType: AccountSubType.DEPRECIATION,
  },
  {
    code: '6500',
    name: 'Bank Charges',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6600',
    name: 'Professional Fees',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6700',
    name: 'Insurance',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },
  {
    code: '6800',
    name: 'Repairs & Maintenance',
    type: AccountType.EXPENSE,
    subType: AccountSubType.OPERATING_EXPENSE,
  },

  // TAX
  {
    code: '7000',
    name: 'Income Tax Expense',
    type: AccountType.EXPENSE,
    subType: AccountSubType.TAX_EXPENSE,
  },
];
