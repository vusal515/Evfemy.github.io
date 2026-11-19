/**
 * Prices are stored in AZN in the content files and converted to integer
 * qəpik (1/100 AZN) for every calculation, so totals never pick up
 * floating-point errors such as 0.1 + 0.2.
 */
export const toCents = (amount) => Math.round(Number(amount) * 100);

/** 2490 -> "24,90 ₼" (Azerbaijani format: comma decimals, manat sign after). */
export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole},${fraction} ₼`;
}

export const formatPrice = (amount) => formatCents(toCents(amount));

/** Whole-number discount, or 0 when there is no valid old price. */
export function discountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - toCents(price) / toCents(oldPrice)) * 100);
}

/** Monthly amount for an interest-free instalment plan, rounded up to the qəpik. */
export function monthlyInstallment(price, months) {
  return Math.ceil(toCents(price) / months);
}
