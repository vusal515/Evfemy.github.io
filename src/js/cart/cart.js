import { toCents } from '../lib/money.js';

/**
 * Pure cart rules. State is `{ lines: [{ id, qty }] }`; every function returns
 * a new state and never mutates its input, which keeps the store simple and
 * the rules easy to test without a browser.
 */

export const MAX_QTY_PER_LINE = 10;
export const emptyCart = () => ({ lines: [] });

/** Highest quantity allowed for a product: limited by stock and a per-order cap. */
export const maxQty = (product) => Math.max(0, Math.min(product?.stock ?? 0, MAX_QTY_PER_LINE));

const clampQty = (qty, product) => Math.min(Math.max(Math.trunc(Number(qty)) || 0, 0), maxQty(product));

/**
 * Adds `qty` of a product. Returns `{ state, added }` so the UI can tell the
 * user when the stock limit stopped part of the request.
 */
export function addItem(state, product, qty = 1) {
  if (!product) return { state, added: 0 };
  const existing = state.lines.find((line) => line.id === product.id);
  const current = existing?.qty ?? 0;
  const next = clampQty(current + qty, product);
  const added = next - current;
  if (added <= 0) return { state, added: 0 };
  const lines = existing
    ? state.lines.map((line) => (line.id === product.id ? { ...line, qty: next } : line))
    : [...state.lines, { id: product.id, qty: next }];
  return { state: { lines }, added };
}

/** Sets a line's quantity; 0 or less removes the line. */
export function setQty(state, product, qty) {
  if (!product) return state;
  const next = clampQty(qty, product);
  if (next === 0) return removeItem(state, product.id);
  return { lines: state.lines.map((line) => (line.id === product.id ? { ...line, qty: next } : line)) };
}

export function removeItem(state, id) {
  return { lines: state.lines.filter((line) => line.id !== id) };
}

export const itemCount = (state) => state.lines.reduce((sum, line) => sum + line.qty, 0);

/**
 * Re-checks saved lines against the current catalog: drops products that no
 * longer exist or are sold out, and lowers quantities above the stock. Used
 * when a cart is loaded from storage, because the catalog may have changed.
 */
export function reconcile(state, getProduct) {
  const lines = [];
  const seen = new Set();
  for (const line of state?.lines ?? []) {
    const product = getProduct(line?.id);
    if (!product || seen.has(product.id)) continue;
    const qty = clampQty(line.qty, product);
    if (qty > 0) lines.push({ id: product.id, qty });
    seen.add(product.id);
  }
  return { lines };
}

/** Everything the cart page shows, in qəpik. Delivery is free (see the site banner). */
export function summarize(state, getProduct) {
  const lines = state.lines
    .map((line) => {
      const product = getProduct(line.id);
      if (!product) return null;
      const unit = toCents(product.price);
      const list = toCents(product.oldPrice ?? product.price);
      return { product, qty: line.qty, unit, total: unit * line.qty, savings: Math.max(0, list - unit) * line.qty };
    })
    .filter(Boolean);
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const savings = lines.reduce((sum, l) => sum + l.savings, 0);
  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    savings,
    shipping: 0,
    total: subtotal,
  };
}
