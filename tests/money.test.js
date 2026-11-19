import { describe, expect, it } from 'vitest';
import { discountPercent, formatCents, formatPrice, monthlyInstallment, toCents } from '../src/js/lib/money.js';

describe('money', () => {
  it('converts to integer qəpik without floating-point drift', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
    expect(toCents(19.9) * 3).toBe(5970);
  });

  it('formats in the Azerbaijani style', () => {
    expect(formatCents(2490)).toBe('24,90 ₼');
    expect(formatCents(123456789)).toBe('1 234 567,89 ₼');
    expect(formatCents(-4800)).toBe('-48,00 ₼');
    expect(formatPrice(459)).toBe('459,00 ₼');
  });

  it('computes discounts only for real price drops', () => {
    expect(discountPercent(49.9, 69.9)).toBe(29);
    expect(discountPercent(50, undefined)).toBe(0);
    expect(discountPercent(50, 40)).toBe(0);
  });

  it('rounds instalments up so the plan never under-collects', () => {
    expect(monthlyInstallment(49.9, 12)).toBe(416);
    expect(monthlyInstallment(12, 12)).toBe(100);
  });
});
