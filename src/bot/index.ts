import { Bot } from 'grammy';
import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { registerCommands } from '../commands/index.js';
import { registerMessageHandler } from '../handlers/message.handler.js';
import { servicesMiddleware } from '../middlewares/services.middleware.js';
import { createServices } from '../services/index.js';
import type { BotContext } from './context.js';

export function createBot(prisma: PrismaClient): Bot<BotContext> {
  if (!env.BOT_TOKEN) throw new Error('BOT_TOKEN is required to start the Telegram bot.');
  const bot = new Bot<BotContext>(env.BOT_TOKEN);
  bot.use(servicesMiddleware(createServices(prisma)));
  registerCommands(bot);
  registerMessageHandler(bot);
  bot.catch((error) => {
    logger.error({ error }, 'Bot error');
  });
  return bot;
}
