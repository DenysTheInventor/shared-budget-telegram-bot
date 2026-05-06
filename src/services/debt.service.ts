import type { CurrencyCode, PrismaClient } from '@prisma/client';
import type { Currency } from '../types.js';
import { ExchangeRateService } from './exchange-rate.service.js';

export function calculateDebtRemaining(totalUAH: number, paymentsUAH: number[]): number {
  return Math.max(0, Math.round((totalUAH - paymentsUAH.reduce((sum, payment) => sum + payment, 0)) * 100) / 100);
}

export class DebtService {
  constructor(private readonly prisma: PrismaClient, private readonly exchangeRates: ExchangeRateService) {}

  async addDebt(input: { householdId: string; addedByUserId: string; creditorName: string; amount: number; currency: Currency; dueDate?: Date; note?: string }) {
    const conversion = await this.exchangeRates.convertToUAH(input.amount, input.currency);
    const debt = await this.prisma.debt.create({
      data: {
        householdId: input.householdId,
        addedByUserId: input.addedByUserId,
        creditorName: input.creditorName,
        originalAmount: conversion.originalAmount,
        originalCurrency: conversion.originalCurrency as CurrencyCode,
        convertedAmountUAH: conversion.convertedAmountUAH,
        exchangeRate: conversion.exchangeRate,
        exchangeRateSource: conversion.exchangeRateSource,
        exchangeRateTimestamp: conversion.exchangeRateTimestamp,
        dueDate: input.dueDate,
        note: input.note,
      },
    });
    await this.prisma.auditLog.create({ data: { householdId: input.householdId, userId: input.addedByUserId, action: 'CREATE', entityType: 'Debt', entityId: debt.id, afterJson: debt } });
    return debt;
  }

  async addPayment(input: { householdId: string; addedByUserId: string; debtId: string; amount: number; currency: Currency; paymentDate?: Date; note?: string }) {
    const debt = await this.prisma.debt.findFirstOrThrow({ where: { id: input.debtId, householdId: input.householdId }, include: { payments: true } });
    const conversion = await this.exchangeRates.convertToUAH(input.amount, input.currency);
    const payment = await this.prisma.debtPayment.create({
      data: {
        debtId: input.debtId,
        householdId: input.householdId,
        addedByUserId: input.addedByUserId,
        originalAmount: conversion.originalAmount,
        originalCurrency: conversion.originalCurrency as CurrencyCode,
        convertedAmountUAH: conversion.convertedAmountUAH,
        exchangeRate: conversion.exchangeRate,
        exchangeRateSource: conversion.exchangeRateSource,
        exchangeRateTimestamp: conversion.exchangeRateTimestamp,
        paymentDate: input.paymentDate ?? new Date(),
        note: input.note,
      },
    });
    const remaining = calculateDebtRemaining(Number(debt.convertedAmountUAH), [...debt.payments.map((item) => Number(item.convertedAmountUAH)), conversion.convertedAmountUAH]);
    await this.prisma.debt.update({ where: { id: debt.id }, data: { status: remaining <= 0 ? 'CLOSED' : 'PARTIALLY_PAID' } });
    await this.prisma.auditLog.create({ data: { householdId: input.householdId, userId: input.addedByUserId, action: 'CREATE', entityType: 'DebtPayment', entityId: payment.id, afterJson: payment } });
    return { payment, remaining };
  }

  async openDebts(householdId: string, now = new Date()) {
    const debts = await this.prisma.debt.findMany({
      where: { householdId, deletedAt: null, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
      include: { payments: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return debts.map((debt) => {
      const remainingUAH = calculateDebtRemaining(Number(debt.convertedAmountUAH), debt.payments.map((item) => Number(item.convertedAmountUAH)));
      return { ...debt, remainingUAH, isOverdue: Boolean(debt.dueDate && debt.dueDate < now && remainingUAH > 0) };
    });
  }
}
