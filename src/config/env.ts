import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  MONOBANK_API_URL: z.string().url().default('https://api.monobank.ua/bank/currency'),
  DEFAULT_TIMEZONE: z.string().default('Europe/Kyiv'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
