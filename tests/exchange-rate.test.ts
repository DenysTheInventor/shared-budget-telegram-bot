import { describe, expect, it } from 'vitest';
import { ExchangeRateService } from '../src/services/exchange-rate.service.js';

const prisma = {
  exchangeRate: {
    create: async () => ({}),
    findFirst: async () => null,
  },
};

describe('ExchangeRateService', () => {
  it('converts UAH without external rate', async () => {
    const service = new ExchangeRateService(prisma as never, 'https://example.test', fetch);
    await expect(service.convertToUAH(100, 'UAH')).resolves.toMatchObject({ convertedAmountUAH: 100, exchangeRate: 1 });
  });

  it('uses Monobank rate when available', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => [{ currencyCodeA: 840, currencyCodeB: 980, rateSell: 40.5, date: 1_777_777_777 }] }) as Response;
    const service = new ExchangeRateService(prisma as never, 'https://example.test', fetchImpl);
    await expect(service.convertToUAH(10, 'USD')).resolves.toMatchObject({ convertedAmountUAH: 405, exchangeRate: 40.5, exchangeRateSource: 'MONOBANK' });
  });
});
