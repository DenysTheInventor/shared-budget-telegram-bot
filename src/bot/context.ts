import type { Context } from 'grammy';
import type { Services } from '../services/index.js';

export type BotContext = Context & { services: Services };
