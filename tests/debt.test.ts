import { describe, expect, it } from 'vitest';
import { calculateDebtRemaining } from '../src/services/debt.service.js';

describe('calculateDebtRemaining', () => {
  it('subtracts payments from total debt', () => {
    expect(calculateDebtRemaining(1000, [150, 200])).toBe(650);
  });

  it('does not return negative remaining amount', () => {
    expect(calculateDebtRemaining(1000, [1200])).toBe(0);
  });
});
