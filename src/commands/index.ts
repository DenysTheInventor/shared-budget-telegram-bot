import type { Bot } from 'grammy';
import { format } from 'date-fns';
import type { BotContext } from '../bot/context.js';
import { centerKeyboard, successfulAddKeyboard } from '../bot/keyboards.js';
import { formatMoney } from '../utils/money.js';

async function ensureUser(ctx: BotContext) {
  const from = ctx.from;
  if (!from) throw new Error('Telegram user is missing.');
  return ctx.services.households.upsertTelegramUser({ telegramId: String(from.id), username: from.username, firstName: from.first_name });
}

export function registerCommands(bot: Bot<BotContext>): void {
  bot.command('start', async (ctx) => {
    const user = await ensureUser(ctx);
    const payload = ctx.match?.trim();
    if (payload?.startsWith('invite_')) {
      await ctx.services.households.joinByInvite(user.id, payload.replace('invite_', ''));
      await ctx.reply('✅ You joined the shared household. Use /center to open Weekly Financial Center.', { reply_markup: centerKeyboard() });
      return;
    }
    const household = await ctx.services.households.createHouseholdForUser(user.id, `${user.firstName ?? 'Our'} household`);
    const invite = await ctx.services.households.createInvite(user.id);
    await ctx.reply(
      `👋 Welcome to Shared Budget.\n\nHousehold: ${household.name}\nInvite code for your second user: \`${invite.code}\`\nInvite expires: ${format(invite.expiresAt, 'd MMM yyyy')}\n\nShare: /start invite_${invite.code}`,
      { parse_mode: 'Markdown', reply_markup: centerKeyboard() },
    );
  });

  bot.command('center', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    await ctx.reply(await ctx.services.center.build(householdId), { reply_markup: centerKeyboard() });
  });

  bot.command('today', async (ctx) => ctx.reply('Today view is MVP-light: send expenses naturally, then use /center for the current week.'));
  bot.command('week', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    await ctx.reply(await ctx.services.center.build(householdId), { reply_markup: centerKeyboard() });
  });
  bot.command('month', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    const summary = await ctx.services.transactions.monthlySummary(householdId);
    await ctx.reply(`📅 Monthly summary\n\nIncome: ${formatMoney(summary.income)}\nExpenses: ${formatMoney(summary.expenses)}\nBalance: ${formatMoney(summary.balance)}`);
  });

  bot.command('add_expense', (ctx) => ctx.reply('Send an expense like: `450 THB food` or `Netflix 12 USD subscription`.', { parse_mode: 'Markdown' }));
  bot.command('add_income', (ctx) => ctx.reply('Send income like: `salary 40000 UAH`.', { parse_mode: 'Markdown' }));
  bot.command('add_debt', (ctx) => ctx.reply('Send debt like: `debt 500 USD to Alex due 25 May`.', { parse_mode: 'Markdown' }));
  bot.command('add_recurring', (ctx) => ctx.reply('Send recurring payment like: `rent 12000 UAH monthly`.', { parse_mode: 'Markdown' }));

  bot.command('debts', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    const debts = await ctx.services.debts.openDebts(householdId);
    await ctx.reply(`💳 Debts\n\n${debts.length ? debts.map((debt) => `- ${debt.creditorName}: ${formatMoney(debt.remainingUAH)} left`).join('\n') : 'No open debts.'}`);
  });

  bot.command('recurring', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    const items = await ctx.services.recurring.active(householdId);
    await ctx.reply(`🔁 Recurring payments\n\n${items.length ? items.map((item) => `- ${item.note ?? item.category.name}: ${Number(item.originalAmount)} ${item.originalCurrency}`).join('\n') : 'No active recurring payments.'}`);
  });

  bot.command('limits', async (ctx) => {
    const [category, amount, period = 'weekly'] = ctx.match.trim().split(/\s+/);
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    if (category && amount && Number.isFinite(Number(amount))) {
      await ctx.services.limits.upsertLimit({ householdId, categoryName: category, amountUAH: Number(amount), period: period.toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY' });
      await ctx.reply(`✅ Limit saved: ${category} ${formatMoney(Number(amount))} ${period}`);
      return;
    }
    const statuses = await ctx.services.limits.statuses(householdId, 'WEEKLY');
    await ctx.reply(`📊 Weekly limits\n\n${statuses.length ? statuses.map((limit) => `${limit.categoryEmoji ?? '📦'} ${limit.categoryName}: ${formatMoney(limit.remainingUAH)} left`).join('\n') : 'Add one with /limits food 6000 weekly'}`);
  });

  bot.command('rates', async (ctx) => {
    const usd = await ctx.services.exchangeRates.getRateToUAH('USD');
    const thb = await ctx.services.exchangeRates.getRateToUAH('THB');
    await ctx.reply(`💱 Rates to UAH\n\nUSD: ${usd.exchangeRate} (${usd.exchangeRateSource})\nTHB: ${thb.exchangeRate} (${thb.exchangeRateSource})`);
  });

  bot.command('settings', (ctx) => ctx.reply('⚙️ Settings MVP: base currency is UAH, supported currencies are UAH/USD/THB.'));
  bot.command('help', (ctx) => ctx.reply('Examples:\n450 THB food\nsalary 40000 UAH\ndebt 500 USD to Alex due 25 May\npaid 100 USD for Alex debt\nweekly center\nmonthly summary'));

  bot.callbackQuery('center', async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    await ctx.editMessageText(await ctx.services.center.build(householdId), { reply_markup: centerKeyboard() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/add_(expense|income|debt|recurring)/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Send the record as text.' });
  });

  bot.callbackQuery(/delete:(expense|income):(.+)/, async (ctx) => {
    const user = await ensureUser(ctx);
    const householdId = await ctx.services.households.requireHousehold(user.id);
    const id = ctx.match[2];
    await ctx.services.transactions.deleteTransaction(householdId, user.id, id);
    await ctx.editMessageText('🗑️ Record deleted.');
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/edit:.+/, async (ctx) => ctx.answerCallbackQuery({ text: 'Edit flow is planned for the next MVP iteration.' }));
  bot.callbackQuery(/delete:.+/, async (ctx) => ctx.answerCallbackQuery({ text: 'Delete is implemented for income/expense records in MVP.' }));
}

export { successfulAddKeyboard };
