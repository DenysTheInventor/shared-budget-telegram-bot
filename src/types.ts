export type Currency = 'UAH' | 'USD' | 'THB';
export type TransactionKind = 'EXPENSE' | 'INCOME';

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: Currency;
  convertedAmountUAH: number;
  exchangeRate: number;
  exchangeRateSource: string;
  exchangeRateTimestamp: Date;
}

export interface ParsedBudgetMessage {
  intent:
    | 'ADD_EXPENSE'
    | 'ADD_INCOME'
    | 'ADD_DEBT'
    | 'ADD_DEBT_PAYMENT'
    | 'SHOW_CENTER'
    | 'SHOW_DEBTS'
    | 'SHOW_MONTH'
    | 'ASK_LIMIT'
    | 'UNKNOWN';
  amount?: number;
  currency?: Currency;
  categoryName?: string;
  note?: string;
  creditorName?: string;
  date?: Date;
  recurringFrequency?: 'WEEKLY' | 'MONTHLY';
}
