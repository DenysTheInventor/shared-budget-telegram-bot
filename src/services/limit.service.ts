import type { LimitPeriod, PrismaClient } from '@prisma/client';
import { getMonthRange, getWeekRange } from '../utils/dates.js';
import { CategoryService } from './category.service.js';

export interface LimitStatus {
  categoryName: string;
  categoryEmoji?: string | null;
  amountUAH: number;
  spentUAH: number;
  remainingUAH: number;
  percentUsed: number;
  state: 'OK' | 'WARNING_50' | 'WARNING_80' | 'AT_LIMIT' | 'OVER_LIMIT';
}

export function calculateLimitStatus(input: { amountUAH: number; spentUAH: number; categoryName: string; categoryEmoji?: string | null }): LimitStatus {
  const percentUsed = input.amountUAH <= 0 ? 100 : Math.round((input.spentUAH / input.amountUAH) * 100);
  const remainingUAH = Math.round((input.amountUAH - input.spentUAH) * 100) / 100;
  const state = remainingUAH < 0 ? 'OVER_LIMIT' : percentUsed >= 100 ? 'AT_LIMIT' : percentUsed >= 80 ? 'WARNING_80' : percentUsed >= 50 ? 'WARNING_50' : 'OK';
  return { ...input, remainingUAH, percentUsed, state };
}

export class LimitService {
  private readonly categories: CategoryService;

  constructor(private readonly prisma: PrismaClient) {
    this.categories = new CategoryService(prisma);
  }

  async upsertLimit(input: { householdId: string; categoryName: string; period: LimitPeriod; amountUAH: number }) {
    const category = await this.categories.findOrCreate(input.householdId, 'EXPENSE', input.categoryName);
    return this.prisma.limit.upsert({
      where: { householdId_categoryId_period: { householdId: input.householdId, categoryId: category.id, period: input.period } },
      create: { householdId: input.householdId, categoryId: category.id, period: input.period, amountUAH: input.amountUAH },
      update: { amountUAH: input.amountUAH, warning50Sent: false, warning80Sent: false, warning100Sent: false },
      include: { category: true },
    });
  }

  async statuses(householdId: string, period: LimitPeriod, now = new Date()): Promise<LimitStatus[]> {
    const range = period === 'MONTHLY' ? getMonthRange(now) : getWeekRange(now);
    const limits = await this.prisma.limit.findMany({ where: { householdId, period }, include: { category: true } });
    const result: LimitStatus[] = [];
    for (const limit of limits) {
      const spent = await this.prisma.transaction.aggregate({
        where: { householdId, categoryId: limit.categoryId, type: 'EXPENSE', deletedAt: null, transactionDate: { gte: range.start, lte: range.end } },
        _sum: { convertedAmountUAH: true },
      });
      result.push(
        calculateLimitStatus({
          categoryName: limit.category.name,
          categoryEmoji: limit.category.emoji,
          amountUAH: Number(limit.amountUAH),
          spentUAH: Number(spent._sum.convertedAmountUAH ?? 0),
        }),
      );
    }
    return result;
  }
}
