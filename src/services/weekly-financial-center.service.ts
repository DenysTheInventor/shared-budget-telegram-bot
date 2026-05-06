import { formatDistanceToNowStrict } from 'date-fns';
import { daysUntilEndOfWeek, formatPeriod, getWeekRange } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';
import { DebtService } from './debt.service.js';
import { LimitService } from './limit.service.js';
import { RecurringPaymentService } from './recurring-payment.service.js';
import { TransactionService } from './transaction.service.js';

export class WeeklyFinancialCenterService {
  constructor(
    private readonly transactions: TransactionService,
    private readonly limits: LimitService,
    private readonly debts: DebtService,
    private readonly recurring: RecurringPaymentService,
  ) {}

  async build(householdId: string, now = new Date()): Promise<string> {
    const week = getWeekRange(now);
    const summary = await this.transactions.weeklySummary(householdId, now);
    const limitStatuses = await this.limits.statuses(householdId, 'WEEKLY', now);
    const upcomingRecurring = await this.recurring.upcoming(householdId, 7, now);
    const debts = await this.debts.openDebts(householdId, now);
    const safeToSpend = Math.max(0, summary.balance) / daysUntilEndOfWeek(now);
    const warnings = [
      ...limitStatuses.filter((limit) => limit.state === 'OVER_LIMIT').map((limit) => `⚠️ ${limit.categoryName} is over limit by ${formatMoney(Math.abs(limit.remainingUAH))}`),
      ...debts.filter((debt) => debt.isOverdue).map((debt) => `⚠️ ${debt.creditorName} debt is overdue`),
    ];

    const lines = [
      '💰 Weekly Financial Center',
      '',
      `Period: ${formatPeriod(week.start, week.end)}`,
      '',
      `Income: ${formatMoney(summary.income)}`,
      `Expenses: ${formatMoney(summary.expenses)}`,
      `Balance: ${summary.balance >= 0 ? '+' : ''}${formatMoney(summary.balance)}`,
      '',
      'Safe to spend:',
      `≈ ${formatMoney(safeToSpend)}/day until Sunday`,
      '',
      'Limits:',
      ...(limitStatuses.length ? limitStatuses.map((limit) => `${limit.categoryEmoji ?? '📦'} ${limit.categoryName}: ${limit.remainingUAH >= 0 ? `${formatMoney(limit.remainingUAH)} left from ${formatMoney(limit.amountUAH)}` : `over limit by ${formatMoney(Math.abs(limit.remainingUAH))}`}`) : ['No weekly limits yet. Add one with /limits food 6000 weekly']),
      '',
      'Upcoming:',
      ...(upcomingRecurring.length ? upcomingRecurring.map((item) => `- ${item.note ?? item.category.name}: ${Number(item.originalAmount)} ${item.originalCurrency} ${formatDistanceToNowStrict(item.nextRunDate, { addSuffix: true })}`) : ['No recurring payments in the next 7 days.']),
      '',
      'Debts:',
      ...(debts.length ? debts.slice(0, 5).map((debt) => `- ${debt.creditorName}: ${formatMoney(debt.remainingUAH)} left${debt.dueDate ? `, due ${debt.dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`) : ['No open debts.']),
      '',
      'Top spending categories:',
      ...(summary.topCategories.length ? summary.topCategories.map((item) => `- ${item.emoji ?? '📦'} ${item.name}: ${formatMoney(item.amount)}`) : ['No spending this week.']),
      '',
      'Top 5 expenses:',
      ...(summary.topExpenses.length ? summary.topExpenses.map((item) => `- ${item.categoryEmoji ?? '📦'} ${item.note ?? item.categoryName}: ${formatMoney(item.convertedAmountUAH)}`) : ['No expenses yet.']),
      ...(warnings.length ? ['', 'Warnings:', ...warnings] : []),
    ];
    return lines.join('\n');
  }
}
