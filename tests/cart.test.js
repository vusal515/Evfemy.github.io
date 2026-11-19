import { describe, expect, it } from 'vitest';
import {
  addItem,
  emptyCart,
  itemCount,
  MAX_QTY_PER_LINE,
  reconcile,
  removeItem,
  setQty,
  summarize,
} from '../src/js/cart/cart.js';
import { createCartStore, STORAGE_KEY } from '../src/js/cart/store.js';

const catalog = {
  kettle: { id: 'kettle', price: 49.9, oldPrice: 69.9, stock: 3 },
  bowl: { id: 'bowl', price: 19.9, stock: 50 },
  soldOut: { id: 'soldOut', price: 10, stock: 0 },
};
const getProduct = (id) => catalog[id] ?? null;

class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

describe('cart rules', () => {
  it('adds new lines and merges repeated adds', () => {
    let { state } = addItem(emptyCart(), catalog.bowl, 2);
    ({ state } = addItem(state, catalog.bowl, 1));
    expect(state.lines).toEqual([{ id: 'bowl', qty: 3 }]);
  });

  it('never exceeds stock and reports how many were actually added', () => {
    const first = addItem(emptyCart(), catalog.kettle, 2);
    const second = addItem(first.state, catalog.kettle, 5);
    expect(second.added).toBe(1);
    expect(second.state.lines[0].qty).toBe(3);
    expect(addItem(second.state, catalog.kettle, 1).added).toBe(0);
  });

  it('caps a line at the per-order limit', () => {
    const { state } = addItem(emptyCart(), catalog.bowl, 99);
    expect(state.lines[0].qty).toBe(MAX_QTY_PER_LINE);
  });

  it('ignores sold-out and unknown products', () => {
    expect(addItem(emptyCart(), catalog.soldOut, 1).added).toBe(0);
    expect(addItem(emptyCart(), null, 1).state).toEqual(emptyCart());
  });

  it('removes a line when the quantity drops to zero', () => {
    const { state } = addItem(emptyCart(), catalog.bowl, 2);
    expect(setQty(state, catalog.bowl, 0).lines).toEqual([]);
    expect(setQty(state, catalog.bowl, '4').lines[0].qty).toBe(4);
    expect(removeItem(state, 'bowl').lines).toEqual([]);
  });

  it('does not mutate the previous state', () => {
    const before = addItem(emptyCart(), catalog.bowl, 1).state;
    const snapshot = structuredClone(before);
    addItem(before, catalog.bowl, 1);
    setQty(before, catalog.bowl, 5);
    expect(before).toEqual(snapshot);
  });

  it('reconciles saved carts with the current catalog', () => {
    const saved = {
      lines: [
        { id: 'kettle', qty: 9 },
        { id: 'gone', qty: 1 },
        { id: 'soldOut', qty: 1 },
        { id: 'bowl', qty: 1 },
        { id: 'bowl', qty: 2 },
        null,
      ],
    };
    expect(reconcile(saved, getProduct).lines).toEqual([
      { id: 'kettle', qty: 3 },
      { id: 'bowl', qty: 1 },
    ]);
  });

  it('summarises totals and savings in qəpik', () => {
    let { state } = addItem(emptyCart(), catalog.kettle, 2);
    ({ state } = addItem(state, catalog.bowl, 1));
    const summary = summarize(state, getProduct);
    expect(summary.subtotal).toBe(2 * 4990 + 1990);
    expect(summary.savings).toBe(2 * 2000);
    expect(summary.total).toBe(summary.subtotal);
    expect(summary.shipping).toBe(0);
    expect(summary.count).toBe(3);
    expect(itemCount(state)).toBe(3);
  });
});

describe('cart store', () => {
  it('persists changes and restores them on the next page load', () => {
    const storage = new MemoryStorage();
    const store = createCartStore({ getProduct, storage });
    store.add('bowl', 2);
    const reloaded = createCartStore({ getProduct, storage });
    expect(reloaded.getState().lines).toEqual([{ id: 'bowl', qty: 2 }]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)).lines).toHaveLength(1);
  });

  it('starts empty when saved data is corrupted', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: '{not json' });
    expect(createCartStore({ getProduct, storage }).getState()).toEqual(emptyCart());
  });

  it('keeps working in memory when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {},
    };
    const store = createCartStore({ getProduct, storage: broken });
    expect(store.add('bowl', 1)).toBe(1);
    expect(store.count()).toBe(1);
  });

  it('notifies subscribers only on real changes', () => {
    const store = createCartStore({ getProduct, storage: new MemoryStorage() });
    const calls = [];
    const off = store.subscribe((state) => calls.push(itemCount(state)));
    store.add('bowl', 1);
    store.add('soldOut', 1);
    store.setQty('bowl', 3);
    off();
    store.clear();
    expect(calls).toEqual([1, 3]);
  });

  it('reloads changes written by another tab', () => {
    const storage = new MemoryStorage();
    const tabA = createCartStore({ getProduct, storage });
    const tabB = createCartStore({ getProduct, storage });
    tabA.add('kettle', 1);
    tabB.reload();
    expect(tabB.qtyOf('kettle')).toBe(1);
  });
});
