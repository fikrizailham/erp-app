/**
 * Standard chart-of-accounts codes referenced by other modules when posting
 * automatic journal entries (purchase, production, sale, waste).
 * Seeded by prisma/seed.ts — keep in sync if codes change.
 */
export const ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY_RAW_MATERIAL: '1200',
  INVENTORY_FINISHED_GOODS: '1210',
  ACCOUNTS_PAYABLE: '2000',
  TAX_PAYABLE: '2100',
  OWNERS_EQUITY: '3000',
  RETAINED_EARNINGS: '3900',
  SALES_REVENUE: '4000',
  SALES_DISCOUNTS: '4900',
  COGS: '5000',
  RAW_MATERIAL_WASTE_EXPENSE: '5100',
  FINISHED_GOODS_WASTE_EXPENSE: '5200',
  PRODUCTION_OVERHEAD: '5300',
  OPERATING_EXPENSES: '6000',
} as const;
