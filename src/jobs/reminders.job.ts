import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context.js';
import { NotificationService } from '../services/notification.service.js';

export async function sendPendingReminders(bot: Bot<BotContext>, notifications: NotificationService): Promise<void> {
  const pending = await notifications.pending();
  for (const item of pending) {
    await bot.api.sendMessage(Number(item.userId), `🔔 Reminder: ${item.type}`);
  }
}
