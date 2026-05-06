import type { Currency, ParsedBudgetMessage } from '../types.js';
import { parseLooseDate } from './dates.js';

const currencyAliases: Record<string, Currency> = {
  uah: 'UAH',
  hryvnia: 'UAH',
  грн: 'UAH',
  usd: 'USD',
  dollar: 'USD',
  dollars: 'USD',
  thb: 'THB',
  baht: 'THB',
};

const categories = [
  'food',
  'transport',
  'entertainment',
  'rent',
  'subscription',
  'salary',
  'health',
  'shopping',
  'utilities',
];

export function parseBudgetMessage(text: string, now = new Date()): ParsedBudgetMessage {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return { intent: 'UNKNOWN' };
  if (/(weekly center|\/center|^center$)/.test(normalized)) return { intent: 'SHOW_CENTER' };
  if (/(show debts|^debts$|\/debts)/.test(normalized)) return { intent: 'SHOW_DEBTS' };
  if (/(monthly summary|\/month)/.test(normalized)) return { intent: 'SHOW_MONTH' };
  if (/how much left/.test(normalized)) {
    return { intent: 'ASK_LIMIT', categoryName: findCategory(normalized) };
  }

  const amount = Number(normalized.match(/\b(\d+(?:[.,]\d+)?)\b/)?.[1]?.replace(',', '.'));
  const currency = detectCurrency(normalized) ?? 'UAH';
  const categoryName = findCategory(normalized);
  const date = parseLooseDate(normalized, now);
  const recurringFrequency = normalized.includes('monthly') ? 'MONTHLY' : normalized.includes('weekly') ? 'WEEKLY' : undefined;
  const creditorName = normalized.match(/\bto\s+([a-zа-яіїєґ'-]+)/i)?.[1] ?? normalized.match(/\bfor\s+([a-zа-яіїєґ'-]+)\s+debt/i)?.[1];

  if (!Number.isFinite(amount)) return { intent: 'UNKNOWN', note: text };
  if (/^paid\b|repay|repayment/.test(normalized)) {
    return clean({ intent: 'ADD_DEBT_PAYMENT' as const, amount, currency, creditorName, date, note: text });
  }
  if (/\bdebt\b/.test(normalized)) {
    return clean({ intent: 'ADD_DEBT' as const, amount, currency, creditorName, date, note: text });
  }
  const intent = (/salary|income|paid me|bonus/.test(normalized) || categoryName === 'salary' ? 'ADD_INCOME' : 'ADD_EXPENSE') as const;
  return clean({ intent, amount, currency, categoryName, date, recurringFrequency, note: text });
}

function detectCurrency(text: string): Currency | undefined {
  for (const [alias, currency] of Object.entries(currencyAliases)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(text)) return currency;
  }
  return undefined;
}

function findCategory(text: string): string | undefined {
  return categories.find((category) => new RegExp(`\\b${category}\\b`, 'i').test(text));
}

function clean<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
