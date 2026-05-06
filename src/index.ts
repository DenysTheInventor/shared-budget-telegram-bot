import { prisma } from './config/prisma.js';
import { logger } from './config/logger.js';
import { createBot } from './bot/index.js';

async function main(): Promise<void> {
  await prisma.$connect();
  const bot = createBot(prisma);
  await bot.api.setMyCommands([
    { command: 'start', description: 'Create or join household' },
    { command: 'center', description: 'Weekly Financial Center' },
    { command: 'today', description: 'Today view' },
    { command: 'week', description: 'Weekly summary' },
    { command: 'month', description: 'Monthly summary' },
    { command: 'add_expense', description: 'Add an expense' },
    { command: 'add_income', description: 'Add income' },
    { command: 'add_debt', description: 'Add a debt' },
    { command: 'add_recurring', description: 'Add recurring payment' },
    { command: 'debts', description: 'Show debts' },
    { command: 'recurring', description: 'Show recurring payments' },
    { command: 'limits', description: 'Show or set limits' },
    { command: 'rates', description: 'Show exchange rates' },
    { command: 'settings', description: 'Settings' },
    { command: 'help', description: 'Usage examples' },
  ]);
  logger.info('Shared Budget Telegram bot started');
  await bot.start();
}

main().catch(async (error) => {
  logger.error({ error }, 'Fatal startup error');
  await prisma.$disconnect();
  process.exit(1);
});
