export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency = 'UAH'): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ${currency}`;
}
