import { addDays, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

export function getWeekRange(now = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function getMonthRange(now = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function daysUntilEndOfWeek(now = new Date()): number {
  const today = startOfDay(now);
  const end = startOfDay(getWeekRange(now).end);
  return Math.max(1, Math.floor((end.getTime() - today.getTime()) / 86_400_000) + 1);
}

export function formatPeriod(start: Date, end: Date): string {
  return `${format(start, 'd MMM')}–${format(end, 'd MMM')}`;
}

export function parseLooseDate(input: string, now = new Date()): Date | undefined {
  const lower = input.toLowerCase();
  if (lower.includes('today')) return now;
  if (lower.includes('tomorrow')) return addDays(now, 1);
  const dueMatch = lower.match(/(?:due\s+)?(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (!dueMatch?.[1] || !dueMatch[2]) return undefined;
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(dueMatch[2].slice(0, 3));
  const candidate = new Date(now.getFullYear(), month, Number(dueMatch[1]));
  return candidate < startOfDay(now) ? new Date(now.getFullYear() + 1, month, Number(dueMatch[1])) : candidate;
}
