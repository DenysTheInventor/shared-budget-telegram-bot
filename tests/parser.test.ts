import { describe, expect, it } from 'vitest';
import { parseBudgetMessage } from '../src/utils/parser.js';

describe('parseBudgetMessage', () => {
  it('detects expense amount, currency, and category', () => {
    expect(parseBudgetMessage('450 THB food')).toMatchObject({ intent: 'ADD_EXPENSE', amount: 450, currency: 'THB', categoryName: 'food' });
  });

  it('detects income', () => {
    expect(parseBudgetMessage('salary 40000 UAH')).toMatchObject({ intent: 'ADD_INCOME', amount: 40000, currency: 'UAH', categoryName: 'salary' });
  });

  it('detects debt and creditor', () => {
    expect(parseBudgetMessage('debt 500 USD to Alex due 25 May', new Date('2026-05-06'))).toMatchObject({ intent: 'ADD_DEBT', amount: 500, currency: 'USD', creditorName: 'alex' });
  });
});
