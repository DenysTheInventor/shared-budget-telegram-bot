import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { DebtService } from './debt.service.js';
import { ExchangeRateService } from './exchange-rate.service.js';
import { HouseholdService } from './household.service.js';
import { LimitService } from './limit.service.js';
import { NotificationService } from './notification.service.js';
import { RecurringPaymentService } from './recurring-payment.service.js';
import { TransactionService } from './transaction.service.js';
import { WeeklyFinancialCenterService } from './weekly-financial-center.service.js';

export function createServices(prisma: PrismaClient) {
  const exchangeRates = new ExchangeRateService(prisma, env.MONOBANK_API_URL);
  const transactions = new TransactionService(prisma, exchangeRates);
  const debts = new DebtService(prisma, exchangeRates);
  const limits = new LimitService(prisma);
  const recurring = new RecurringPaymentService(prisma);
  return {
    exchangeRates,
    transactions,
    debts,
    limits,
    recurring,
    households: new HouseholdService(prisma),
    notifications: new NotificationService(prisma),
    center: new WeeklyFinancialCenterService(transactions, limits, debts, recurring),
  };
}

export type Services = ReturnType<typeof createServices>;
