import type { Bot } from 'grammy';
import type { BotContext } from '../bot/context.js';
import { NotificationService } from '../services/notification.service.js';

export async function sendPendingReminders(bot: Bot<BotContext>, notifications: NotificationService): Promise<void> {
  const pending = await notifications.pending();
  for (const item of pending) {
    try {
      await bot.api.sendMessage(Number(item.user.telegramId), `🔔 Reminder: ${item.type}`);
      await notifications.markSent(item.id);
    } catch (error) {
      await notifications.markFailed(item.id, error);
    }
  }
}
