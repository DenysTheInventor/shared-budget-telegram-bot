import type { CurrencyCode, PrismaClient } from '@prisma/client';
import { getMonthRange, getWeekRange } from '../utils/dates.js';
import type { Currency, TransactionKind } from '../types.js';
import { CategoryService } from './category.service.js';
import { ExchangeRateService } from './exchange-rate.service.js';

export interface SummaryTransaction {
  type: TransactionKind;
  convertedAmountUAH: number;
  categoryName: string;
  categoryEmoji?: string | null;
  note?: string | null;
  transactionDate: Date;
}

export function calculateSummary(transactions: SummaryTransaction[]) {
  const income = transactions.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.convertedAmountUAH, 0);
  const expenses = transactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.convertedAmountUAH, 0);
  const byCategory = new Map<string, { name: string; emoji?: string | null; amount: number }>();
  for (const tx of transactions.filter((item) => item.type === 'EXPENSE')) {
    const current = byCategory.get(tx.categoryName) ?? { name: tx.categoryName, emoji: tx.categoryEmoji, amount: 0 };
    current.amount += tx.convertedAmountUAH;
    byCategory.set(tx.categoryName, current);
  }
  return {
    income,
    expenses,
    balance: income - expenses,
    topCategories: [...byCategory.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    topExpenses: transactions.filter((item) => item.type === 'EXPENSE').sort((a, b) => b.convertedAmountUAH - a.convertedAmountUAH).slice(0, 5),
  };
}

export class TransactionService {
  private readonly categories: CategoryService;

  constructor(private readonly prisma: PrismaClient, private readonly exchangeRates: ExchangeRateService) {
    this.categories = new CategoryService(prisma);
  }

  async addTransaction(input: {
    householdId: string;
    addedByUserId: string;
    type: TransactionKind;
    amount: number;
    currency: Currency;
    categoryName?: string;
    note?: string;
    transactionDate?: Date;
  }) {
    const category = await this.categories.findOrCreate(input.householdId, input.type, input.categoryName);
    const conversion = await this.exchangeRates.convertToUAH(input.amount, input.currency);
    const transaction = await this.prisma.transaction.create({
      data: {
        householdId: input.householdId,
        addedByUserId: input.addedByUserId,
        type: input.type,
        categoryId: category.id,
        originalAmount: conversion.originalAmount,
        originalCurrency: conversion.originalCurrency as CurrencyCode,
        convertedAmountUAH: conversion.convertedAmountUAH,
        exchangeRate: conversion.exchangeRate,
        exchangeRateSource: conversion.exchangeRateSource,
        exchangeRateTimestamp: conversion.exchangeRateTimestamp,
        note: input.note,
        transactionDate: input.transactionDate ?? new Date(),
      },
      include: { category: true, addedBy: true },
    });
    await this.prisma.auditLog.create({
      data: { householdId: input.householdId, userId: input.addedByUserId, action: 'CREATE', entityType: 'Transaction', entityId: transaction.id, afterJson: transaction },
    });
    return transaction;
  }

  async deleteTransaction(householdId: string, userId: string, transactionId: string) {
    const before = await this.prisma.transaction.findFirstOrThrow({ where: { id: transactionId, householdId } });
    const deleted = await this.prisma.transaction.update({ where: { id: transactionId }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { householdId, userId, action: 'DELETE', entityType: 'Transaction', entityId: transactionId, beforeJson: before, afterJson: deleted },
    });
    return deleted;
  }

  async weeklySummary(householdId: string, now = new Date()) {
    const range = getWeekRange(now);
    return this.summaryForRange(householdId, range.start, range.end);
  }

  async monthlySummary(householdId: string, now = new Date()) {
    const range = getMonthRange(now);
    return this.summaryForRange(householdId, range.start, range.end);
  }

  async summaryForRange(householdId: string, start: Date, end: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: { householdId, deletedAt: null, transactionDate: { gte: start, lte: end } },
      include: { category: true },
    });
    return calculateSummary(
      transactions.map((tx) => ({
        type: tx.type,
        convertedAmountUAH: Number(tx.convertedAmountUAH),
        categoryName: tx.category.name,
        categoryEmoji: tx.category.emoji,
        note: tx.note,
        transactionDate: tx.transactionDate,
      })),
    );
  }

  async recent(householdId: string, take = 5) {
    return this.prisma.transaction.findMany({ where: { householdId, deletedAt: null }, include: { category: true }, orderBy: { transactionDate: 'desc' }, take });
  }
}
