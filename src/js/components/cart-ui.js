import { qsa, on } from '../lib/dom.js';
import { routes } from '../lib/routes.js';

const TOAST_MS = 4000;

/** Short, polite notification; the region is a live region so screen readers hear it. */
export function createToast(root = document) {
  const region = root.querySelector('[data-toast]');
  let timer;
  return function show(message, link) {
    if (!region) return;
    region.replaceChildren(document.createTextNode(message));
    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      a.className = 'toast__link';
      region.append(' ', a);
    }
    region.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      region.hidden = true;
    }, TOAST_MS);
  };
}

/** Keeps every cart badge (desktop and mobile header) in sync with the store. */
export function initCartBadge(root, store) {
  const update = () => {
    const count = store.count();
    qsa('[data-cart-count]', root).forEach((badge) => {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = count === 0;
    });
    qsa('[data-cart-link]', root).forEach((link) =>
      link.setAttribute('aria-label', count ? `Səbət, ${count} məhsul` : 'Səbət, boşdur'),
    );
  };
  update();
  return store.subscribe(update);
}

/**
 * One delegated handler for every "add to cart" button, including buttons
 * rendered later by the category and product pages. A button may point at a
 * quantity input with `data-qty-from="#id"`.
 */
export function initAddToCart(root, store, { getProduct, toast = createToast(root) } = {}) {
  return on(root, 'click', (event) => {
    const button = event.target.closest?.('[data-add-to-cart]');
    if (!button || button.disabled) return;
    const id = button.dataset.addToCart;
    const qtyInput = button.dataset.qtyFrom ? root.querySelector(button.dataset.qtyFrom) : null;
    const qty = Math.max(1, Number.parseInt(qtyInput?.value ?? '1', 10) || 1);
    const added = store.add(id, qty);
    const name = getProduct?.(id)?.name ?? 'Məhsul';
    if (added === 0)
      toast('Bu məhsuldan səbətdə artıq maksimum miqdar var.', { href: routes.cart(), label: 'Səbətə bax' });
    else if (added < qty)
      toast(`Stokda qalan ${added} ədəd səbətə əlavə edildi.`, { href: routes.cart(), label: 'Səbətə bax' });
    else toast(`"${name}" səbətə əlavə edildi.`, { href: routes.cart(), label: 'Səbətə bax' });
  });
}

/** Another tab changed the cart: reload it so badges and the cart page stay correct. */
export function initCartSync(store, target = window) {
  return on(target, 'storage', (event) => {
    if (event.key === store.storageKey) store.reload();
  });
}
