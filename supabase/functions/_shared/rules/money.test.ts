import { it, expect } from 'vitest';
import { formatMoney } from './money.ts';

it('formatMoney', () => {
  expect(formatMoney(10)).toBe('R$10');
  expect(formatMoney(12.5)).toBe('R$12,50');
});
