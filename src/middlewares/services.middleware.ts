import type { MiddlewareFn } from 'grammy';
import type { BotContext } from '../bot/context.js';
import type { Services } from '../services/index.js';

export function servicesMiddleware(services: Services): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    ctx.services = services;
    await next();
  };
}
