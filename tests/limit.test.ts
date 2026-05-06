import { describe, expect, it } from 'vitest';
import { calculateLimitStatus } from '../src/services/limit.service.js';

describe('calculateLimitStatus', () => {
  it('detects over-limit category', () => {
    expect(calculateLimitStatus({ amountUAH: 1000, spentUAH: 1200, categoryName: 'Food' })).toMatchObject({ remainingUAH: -200, percentUsed: 120, state: 'OVER_LIMIT' });
  });

  it('detects 80 percent warning', () => {
    expect(calculateLimitStatus({ amountUAH: 1000, spentUAH: 850, categoryName: 'Food' }).state).toBe('WARNING_80');
  });
});
