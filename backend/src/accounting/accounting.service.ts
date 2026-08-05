import { BadRequestException, Injectable } from '@nestjs/common';
import { JournalSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildRunningNumber } from '../common/utils/document-number.util';
import { CreateAccountDto } from './dto/create-account.dto';

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostJournalInput {
  sourceType: JournalSourceType;
  sourceId?: string;
  description?: string;
  date?: Date;
  createdById?: string;
  lines: JournalLineInput[];
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  createAccount(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }

  findAccounts() {
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }

  /**
   * Posts a balanced double-entry journal for any business event (purchase,
   * production, sale, waste, manual adjustment). Throws if debits != credits.
   */
  async postJournal(input: PostJournalInput) {
    const totalDebit = input.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Unbalanced journal entry: debit ${totalDebit} != credit ${totalCredit}`,
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: { code: { in: input.lines.map((l) => l.accountCode) } },
    });
    const accountByCode = new Map(accounts.map((a) => [a.code, a]));

    const count = await this.prisma.journalEntry.count();
    const entryNumber = buildRunningNumber('JE', count + 1);

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: input.date ?? new Date(),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        description: input.description,
        createdById: input.createdById,
        lines: {
          create: input.lines.map((l) => {
            const account = accountByCode.get(l.accountCode);
            if (!account) {
              throw new BadRequestException(`Unknown account code: ${l.accountCode}`);
            }
            return {
              accountId: account.id,
              debit: l.debit ?? 0,
              credit: l.credit ?? 0,
              description: l.description,
            };
          }),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  findJournalEntries(sourceType?: string) {
    return this.prisma.journalEntry.findMany({
      where: sourceType ? { sourceType: sourceType as any } : undefined,
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  /** Simplified Profit & Loss for a date range. */
  async profitAndLoss(from: Date, to: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: { journalEntry: { date: { gte: from, lte: to } } },
      include: { account: true },
    });

    const byType = (type: string) =>
      lines
        .filter((l) => l.account.type === type)
        .reduce((sum, l) => sum + Number(l.credit) - Number(l.debit), 0);

    const revenue = byType('REVENUE'); // credit-normal: credit - debit is already positive
    const cogsAmount = lines
      .filter((l) => l.account.type === 'COGS')
      .reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
    const expenseAmount = lines
      .filter((l) => l.account.type === 'EXPENSE')
      .reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);

    const grossProfit = revenue - cogsAmount;
    const netProfit = grossProfit - expenseAmount;

    return { from, to, revenue, cogs: cogsAmount, grossProfit, operatingExpenses: expenseAmount, netProfit };
  }

  /** Simplified Balance Sheet as of a date. */
  async balanceSheet(asOf: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: { journalEntry: { date: { lte: asOf } } },
      include: { account: true },
    });

    const sumByType = (type: string) =>
      lines
        .filter((l) => l.account.type === type)
        .reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);

    const assets = sumByType('ASSET');
    const liabilities = -sumByType('LIABILITY');
    const statedEquity = -sumByType('EQUITY');

    // Books aren't formally "closed" each period, so undistributed net income
    // (revenue - expenses - COGS since inception) still belongs to equity for
    // the accounting identity (Assets = Liabilities + Equity) to hold.
    const revenueSinceInception = -sumByType('REVENUE');
    const expenseSinceInception = sumByType('EXPENSE');
    const cogsSinceInception = sumByType('COGS');
    const retainedEarnings = revenueSinceInception - expenseSinceInception - cogsSinceInception;
    const equity = statedEquity + retainedEarnings;

    return { asOf, assets, liabilities, equity, checksOut: Math.abs(assets - (liabilities + equity)) < 1 };
  }

  /** Cash flow approximation: net movement through cash/bank accounts. */
  async cashFlow(from: Date, to: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: { date: { gte: from, lte: to } },
        account: { code: { in: ['1000', '1010'] } },
      },
    });
    const netCashFlow = lines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
    return { from, to, netCashFlow };
  }

  /** Product-level profitability: revenue and COGS derived from sale items. */
  async productProfitability(from: Date, to: Date) {
    const saleItems = await this.prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      include: { product: true, batch: { include: { productionOrder: true } } },
    });

    const byProduct = new Map<string, { name: string; revenue: number; unitsSold: number }>();
    for (const item of saleItems) {
      const key = item.productId;
      const entry = byProduct.get(key) ?? { name: item.product.name, revenue: 0, unitsSold: 0 };
      entry.revenue += Number(item.subtotal);
      entry.unitsSold += Number(item.quantity);
      byProduct.set(key, entry);
    }

    return Array.from(byProduct.entries()).map(([productId, v]) => ({ productId, ...v }));
  }
}
