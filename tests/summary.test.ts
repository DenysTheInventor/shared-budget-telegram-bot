import { describe, expect, it } from 'vitest';
import { calculateSummary } from '../src/services/transaction.service.js';

describe('calculateSummary', () => {
  it('calculates weekly totals and top categories', () => {
    const summary = calculateSummary([
      { type: 'INCOME', convertedAmountUAH: 1000, categoryName: 'Salary', transactionDate: new Date() },
      { type: 'EXPENSE', convertedAmountUAH: 200, categoryName: 'Food', categoryEmoji: '🍔', transactionDate: new Date() },
      { type: 'EXPENSE', convertedAmountUAH: 100, categoryName: 'Food', categoryEmoji: '🍔', transactionDate: new Date() },
    ]);
    expect(summary).toMatchObject({ income: 1000, expenses: 300, balance: 700 });
    expect(summary.topCategories[0]).toMatchObject({ name: 'Food', amount: 300 });
  });
});
