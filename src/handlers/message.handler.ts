import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context.js';
import { centerKeyboard, successfulAddKeyboard } from '../bot/keyboards.js';
import { parseBudgetMessage } from '../utils/parser.js';
import { formatMoney } from '../utils/money.js';

async function ensureUser(ctx: BotContext) {
  const from = ctx.from;
  if (!from) throw new Error('Telegram user is missing.');
  return ctx.services.households.upsertTelegramUser({ telegramId: String(from.id), username: from.username, firstName: from.first_name });
}

export function registerMessageHandler(bot: Bot<BotContext>): void {
  bot.on('message:text', async (ctx) => {
    const parsed = parseBudgetMessage(ctx.message.text);
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);

    if (parsed.intent === 'SHOW_CENTER') {
      await ctx.reply(await ctx.services.center.build(householdId), { reply_markup: centerKeyboard() });
      return;
    }
    if (parsed.intent === 'SHOW_DEBTS') {
      const debts = await ctx.services.debts.openDebts(householdId);
      await ctx.reply(`💳 Debts\n\n${debts.length ? debts.map((debt) => `- ${debt.creditorName}: ${formatMoney(debt.remainingUAH)} left`).join('\n') : 'No open debts.'}`);
      return;
    }
    if (parsed.intent === 'SHOW_MONTH') {
      const summary = await ctx.services.transactions.monthlySummary(householdId);
      await ctx.reply(`📅 Monthly summary\n\nIncome: ${formatMoney(summary.income)}\nExpenses: ${formatMoney(summary.expenses)}\nBalance: ${formatMoney(summary.balance)}`);
      return;
    }

    if ((parsed.intent === 'ADD_EXPENSE' || parsed.intent === 'ADD_INCOME') && !parsed.recurringFrequency && parsed.amount && parsed.currency) {
      const tx = await ctx.services.transactions.addTransaction({
        householdId,
        addedByUserId: user.id,
        type: parsed.intent === 'ADD_INCOME' ? 'INCOME' : 'EXPENSE',
        amount: parsed.amount,
        currency: parsed.currency,
        categoryName: parsed.categoryName,
        note: parsed.note,
        transactionDate: parsed.date,
      });
      await ctx.reply(
        `✅ ${tx.type === 'INCOME' ? 'Income' : 'Expense'} added\n\n${tx.category.emoji ?? '📦'} ${tx.category.name}\n${Number(tx.originalAmount)} ${tx.originalCurrency} ≈ ${formatMoney(Number(tx.convertedAmountUAH))}\nAdded by: ${tx.addedBy.firstName ?? tx.addedBy.username ?? 'you'}\nDate: ${tx.transactionDate.toLocaleDateString('en-GB')}`,
        { reply_markup: successfulAddKeyboard(tx.type === 'INCOME' ? 'income' : 'expense', tx.id) },
      );
      return;
    }

    if (parsed.intent === 'ADD_DEBT' && parsed.amount && parsed.currency) {
      const debt = await ctx.services.debts.addDebt({
        householdId,
        addedByUserId: user.id,
        creditorName: parsed.creditorName ?? 'Unknown creditor',
        amount: parsed.amount,
        currency: parsed.currency,
        dueDate: parsed.date,
        note: parsed.note,
      });
      await ctx.reply(`✅ Debt added\n\n${debt.creditorName}\n${Number(debt.originalAmount)} ${debt.originalCurrency} ≈ ${formatMoney(Number(debt.convertedAmountUAH))}`, {
        reply_markup: successfulAddKeyboard('debt', debt.id),
      });
      return;
    }

    if (parsed.intent === 'ADD_DEBT_PAYMENT' && parsed.amount && parsed.currency) {
      const debts = await ctx.services.debts.openDebts(householdId);
      const debt = debts.find((item) => item.creditorName.toLowerCase() === parsed.creditorName?.toLowerCase()) ?? debts[0];
      if (!debt) {
        await ctx.reply('No open debt found to apply this payment.');
        return;
      }
      const result = await ctx.services.debts.addPayment({ householdId, addedByUserId: user.id, debtId: debt.id, amount: parsed.amount, currency: parsed.currency, note: parsed.note });
      await ctx.reply(`✅ Debt payment added\n\n${Number(result.payment.originalAmount)} ${result.payment.originalCurrency} ≈ ${formatMoney(Number(result.payment.convertedAmountUAH))}\nRemaining: ${formatMoney(result.remaining)}`);
      return;
    }

    if (parsed.recurringFrequency && parsed.amount && parsed.currency) {
      const recurring = await ctx.services.recurring.create({
        householdId,
        addedByUserId: user.id,
        type: parsed.intent === 'ADD_INCOME' ? 'INCOME' : 'EXPENSE',
        categoryName: parsed.categoryName,
        amount: parsed.amount,
        currency: parsed.currency,
        note: parsed.note,
        frequency: parsed.recurringFrequency,
        nextRunDate: parsed.date ?? new Date(),
      });
      await ctx.reply(`✅ Recurring payment added\n\n${recurring.category.emoji ?? '🔁'} ${recurring.note ?? recurring.category.name}\n${Number(recurring.originalAmount)} ${recurring.originalCurrency}\nFrequency: ${recurring.frequency}`, {
        reply_markup: successfulAddKeyboard('recurring', recurring.id),
      });
      return;
    }

    await ctx.reply('I could not understand that yet. Try `450 THB food`, `salary 40000 UAH`, or /help.', { parse_mode: 'Markdown' });
  });
}
