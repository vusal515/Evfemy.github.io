import { addItem, emptyCart, itemCount, reconcile, removeItem, setQty } from './cart.js';

export const STORAGE_KEY = 'evfemiya.cart.v1';

function safeStorage(storage) {
  try {
    const probe = '__evfemiya_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null; // private mode, disabled cookies, or quota exceeded
  }
}

/**
 * Cart state with persistence. Storage failures and corrupted data never
 * break the page: the cart falls back to an in-memory empty state.
 */
export function createCartStore({ getProduct, storage = globalThis.localStorage, key = STORAGE_KEY } = {}) {
  const store = storage ? safeStorage(storage) : null;
  const listeners = new Set();

  const load = () => {
    if (!store) return emptyCart();
    try {
      return reconcile(JSON.parse(store.getItem(key) ?? 'null') ?? emptyCart(), getProduct);
    } catch {
      return emptyCart();
    }
  };

  let state = load();

  const save = () => {
    try {
      store?.setItem(key, JSON.stringify(state));
    } catch {
      /* keep working in memory */
    }
  };

  const commit = (next) => {
    if (next === state) return;
    state = next;
    save();
    listeners.forEach((listener) => listener(state));
  };

  return {
    getState: () => state,
    count: () => itemCount(state),
    qtyOf: (id) => state.lines.find((line) => line.id === id)?.qty ?? 0,
    add(id, qty = 1) {
      const result = addItem(state, getProduct(id), qty);
      commit(result.state);
      return result.added;
    },
    setQty: (id, qty) => commit(setQty(state, getProduct(id), qty)),
    remove: (id) => commit(removeItem(state, id)),
    clear: () => commit(emptyCart()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Picks up changes made in another tab (the `storage` event). */
    reload: () => {
      state = load();
      listeners.forEach((listener) => listener(state));
    },
    storageKey: key,
  };
}
