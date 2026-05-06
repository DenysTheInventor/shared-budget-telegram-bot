import type { CurrencyCode, PrismaClient, RecurringFrequency } from '@prisma/client';
import type { Currency, TransactionKind } from '../types.js';
import { CategoryService } from './category.service.js';

export class RecurringPaymentService {
  private readonly categories: CategoryService;

  constructor(private readonly prisma: PrismaClient) {
    this.categories = new CategoryService(prisma);
  }

  async create(input: {
    householdId: string;
    addedByUserId: string;
    type: TransactionKind;
    categoryName?: string;
    amount: number;
    currency: Currency;
    note?: string;
    frequency: RecurringFrequency;
    intervalDays?: number;
    nextRunDate: Date;
    autoCreateTransaction?: boolean;
  }) {
    const category = await this.categories.findOrCreate(input.householdId, input.type, input.categoryName);
    return this.prisma.recurringPayment.create({
      data: {
        householdId: input.householdId,
        addedByUserId: input.addedByUserId,
        type: input.type,
        categoryId: category.id,
        originalAmount: input.amount,
        originalCurrency: input.currency as CurrencyCode,
        note: input.note,
        frequency: input.frequency,
        intervalDays: input.intervalDays,
        nextRunDate: input.nextRunDate,
        autoCreateTransaction: input.autoCreateTransaction ?? false,
      },
      include: { category: true },
    });
  }

  async active(householdId: string) {
    return this.prisma.recurringPayment.findMany({ where: { householdId, isActive: true }, include: { category: true }, orderBy: { nextRunDate: 'asc' } });
  }

  async upcoming(householdId: string, days = 7, now = new Date()) {
    const until = new Date(now);
    until.setDate(until.getDate() + days);
    return this.prisma.recurringPayment.findMany({
      where: { householdId, isActive: true, nextRunDate: { gte: now, lte: until } },
      include: { category: true },
      orderBy: { nextRunDate: 'asc' },
    });
  }
}
