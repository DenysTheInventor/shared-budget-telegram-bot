import type { PrismaClient } from '@prisma/client';
import type { ConversionResult, Currency } from '../types.js';
import { roundMoney } from '../utils/money.js';

interface MonobankRate {
  currencyCodeA: number;
  currencyCodeB: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
  date: number;
}

const monoCodes: Record<Currency, number> = { UAH: 980, USD: 840, THB: 764 };
const staticFallbackToUAH: Record<Currency, number> = { UAH: 1, USD: 40, THB: 1.1 };

export class ExchangeRateService {
  private memoryCache = new Map<Currency, ConversionResult>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly monobankApiUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async convertToUAH(amount: number, currency: Currency): Promise<ConversionResult> {
    if (currency === 'UAH') {
      return {
        originalAmount: amount,
        originalCurrency: currency,
        convertedAmountUAH: roundMoney(amount),
        exchangeRate: 1,
        exchangeRateSource: 'UAH_BASE',
        exchangeRateTimestamp: new Date(),
      };
    }

    const rate = await this.getRateToUAH(currency);
    return {
      originalAmount: amount,
      originalCurrency: currency,
      convertedAmountUAH: roundMoney(amount * rate.exchangeRate),
      exchangeRate: rate.exchangeRate,
      exchangeRateSource: rate.exchangeRateSource,
      exchangeRateTimestamp: rate.exchangeRateTimestamp,
    };
  }

  async getRateToUAH(currency: Currency): Promise<Omit<ConversionResult, 'originalAmount' | 'originalCurrency' | 'convertedAmountUAH'>> {
    if (currency === 'UAH') {
      return { exchangeRate: 1, exchangeRateSource: 'UAH_BASE', exchangeRateTimestamp: new Date() };
    }

    try {
      const response = await this.fetchImpl(this.monobankApiUrl);
      if (!response.ok) throw new Error(`Monobank responded ${response.status}`);
      const rates = (await response.json()) as MonobankRate[];
      const monoRate = rates.find((rate) => rate.currencyCodeA === monoCodes[currency] && rate.currencyCodeB === monoCodes.UAH);
      const exchangeRate = monoRate?.rateSell ?? monoRate?.rateCross ?? monoRate?.rateBuy;
      if (exchangeRate) {
        const fetchedAt = new Date((monoRate?.date ?? Date.now() / 1000) * 1000);
        await this.prisma.exchangeRate.create({
          data: { baseCurrency: currency, quoteCurrency: 'UAH', rate: exchangeRate, source: 'MONOBANK', fetchedAt },
        });
        const result = { exchangeRate, exchangeRateSource: 'MONOBANK', exchangeRateTimestamp: fetchedAt };
        this.memoryCache.set(currency, { originalAmount: 1, originalCurrency: currency, convertedAmountUAH: exchangeRate, ...result });
        return result;
      }
    } catch {
      // Fallback below keeps MVP resilient when Monobank/network is unavailable.
    }

    const latest = await this.prisma.exchangeRate.findFirst({
      where: { baseCurrency: currency, quoteCurrency: 'UAH' },
      orderBy: { fetchedAt: 'desc' },
    });
    if (latest) {
      return { exchangeRate: Number(latest.rate), exchangeRateSource: `${latest.source}_CACHED`, exchangeRateTimestamp: latest.fetchedAt };
    }
    const cached = this.memoryCache.get(currency);
    if (cached) {
      return {
        exchangeRate: cached.exchangeRate,
        exchangeRateSource: `${cached.exchangeRateSource}_MEMORY`,
        exchangeRateTimestamp: cached.exchangeRateTimestamp,
      };
    }
    return { exchangeRate: staticFallbackToUAH[currency], exchangeRateSource: 'STATIC_FALLBACK', exchangeRateTimestamp: new Date() };
  }
}
