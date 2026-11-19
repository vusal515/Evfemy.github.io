import { html } from '../../render/html.js';
import { imageUrl } from '../../render/assets.js';
import { routes } from '../lib/routes.js';
import { formatCents } from '../lib/money.js';
import { maxQty, summarize } from '../cart/cart.js';
import { handleSubmit } from '../components/forms.js';
import { on } from '../lib/dom.js';

/** Cart page: line items, totals and the checkout form. */

function emptyCart() {
  return html`<h1 class="page__title">Səbət</h1>
    <div class="empty-state">
      <p>Səbətiniz boşdur.</p>
      <a class="button button--primary" href="${routes.category('endirim')}">Endirimli məhsullara bax</a>
      <a class="button button--secondary" href="${routes.home()}">Ana səhifə</a>
    </div>`;
}

const line = ({ product, qty, unit, total }) =>
  html`<li class="cart-line">
    <a class="cart-line__media" href="${routes.product(product.id)}" tabindex="-1" aria-hidden="true">
      <img src="${imageUrl(product.image)}" alt="" width="96" height="96" loading="lazy" />
    </a>
    <div class="cart-line__info">
      <a class="cart-line__name" href="${routes.product(product.id)}">${product.name}</a>
      <p class="cart-line__unit">${formatCents(unit)} / ədəd</p>
      ${qty >= maxQty(product) ? html`<p class="cart-line__note">Maksimum miqdar seçilib.</p>` : ''}
    </div>
    <div class="qty" role="group" aria-label="${product.name}: miqdar">
      <button
        type="button"
        class="qty__button"
        data-cart-action="dec"
        data-id="${product.id}"
        data-focus-key="dec-${product.id}"
        aria-label="Azalt"
      >
        −
      </button>
      <input
        class="qty__input"
        type="number"
        inputmode="numeric"
        min="0"
        max="${maxQty(product)}"
        value="${qty}"
        aria-label="${product.name}: miqdar"
        data-cart-qty="${product.id}"
        data-focus-key="qty-${product.id}"
      />
      <button
        type="button"
        class="qty__button"
        data-cart-action="inc"
        data-id="${product.id}"
        data-focus-key="inc-${product.id}"
        aria-label="Artır"
        ${qty >= maxQty(product) ? html`disabled` : ''}
      >
        +
      </button>
    </div>
    <p class="cart-line__total">${formatCents(total)}</p>
    <button
      type="button"
      class="cart-line__remove"
      data-cart-action="remove"
      data-id="${product.id}"
      aria-label="${product.name}: səbətdən sil"
    >
      Sil
    </button>
  </li>`;

export function cartView(summary) {
  return html`<h1 class="page__title">Səbət <span class="page__count">(${summary.count} məhsul)</span></h1>
    <div class="cart">
      <section class="cart__lines" aria-label="Səbətdəki məhsullar">
        <ul>
          ${summary.lines.map(line)}
        </ul>
        <button type="button" class="link-button" data-cart-action="clear">Səbəti təmizlə</button>
      </section>

      <aside class="cart__summary" aria-labelledby="summary-heading">
        <h2 id="summary-heading" class="cart__summary-title">Sifariş xülasəsi</h2>
        <dl class="totals">
          <div>
            <dt>Məhsulların dəyəri</dt>
            <dd>${formatCents(summary.subtotal + summary.savings)}</dd>
          </div>
          ${
            summary.savings
              ? html`<div class="totals__savings">
                  <dt>Endirim</dt>
                  <dd>-${formatCents(summary.savings)}</dd>
                </div>`
              : ''
          }
          <div>
            <dt>Çatdırılma</dt>
            <dd>Ödənişsiz</dd>
          </div>
          <div class="totals__grand">
            <dt>Cəmi</dt>
            <dd>${formatCents(summary.total)}</dd>
          </div>
        </dl>

        <form class="checkout" novalidate data-form="checkout" data-checkout>
          <h3 class="checkout__title">Çatdırılma məlumatları</h3>
          <label class="field">
            <span>Ad Soyad</span>
            <input name="fullName" class="form-control" type="text" autocomplete="name" required />
          </label>
          <label class="field">
            <span>Mobil nömrə</span>
            <input
              name="phone"
              class="form-control"
              type="tel"
              autocomplete="tel"
              placeholder="+994 50 123 45 67"
              required
            />
          </label>
          <label class="field">
            <span>Ünvan</span>
            <input name="address" class="form-control" type="text" autocomplete="street-address" required />
          </label>
          <p class="form-status" role="status" data-form-status></p>
          <button class="button button--primary checkout__submit" type="submit">Sifarişi təsdiqlə</button>
        </form>
      </aside>
    </div>`;
}

/** Re-rendering replaces the markup; put focus back on the control the user was using. */
function rememberFocus(root) {
  const key = root.contains(document.activeElement) ? document.activeElement?.dataset?.focusKey : null;
  return () => {
    if (key) root.querySelector(`[data-focus-key="${key}"]`)?.focus();
  };
}

export function renderCartPage(root, { catalog, cart, api, confirm = (msg) => window.confirm(msg) } = {}) {
  root.removeAttribute('aria-busy');
  let checkoutValues = null;

  const render = () => {
    const restoreFocus = rememberFocus(root);
    const form = root.querySelector('[data-checkout]');
    if (form) checkoutValues = Object.fromEntries(new FormData(form)); // keep what the user typed
    const summary = summarize(cart.getState(), catalog.getProduct);
    root.innerHTML = String(summary.lines.length ? cartView(summary) : emptyCart());
    const next = root.querySelector('[data-checkout]');
    if (next && checkoutValues) {
      for (const [name, value] of Object.entries(checkoutValues)) next.elements.namedItem(name).value = value;
    }
    restoreFocus();
  };

  const offs = [
    cart.subscribe(render),
    on(root, 'click', (event) => {
      const button = event.target.closest?.('[data-cart-action]');
      if (!button) return;
      const { cartAction: action, id } = button.dataset;
      if (action === 'inc') cart.setQty(id, cart.qtyOf(id) + 1);
      if (action === 'dec') cart.setQty(id, cart.qtyOf(id) - 1);
      if (action === 'remove') cart.remove(id);
      if (action === 'clear' && confirm('Səbətdəki bütün məhsullar silinsin?')) cart.clear();
    }),
    on(root, 'change', (event) => {
      const id = event.target.dataset?.cartQty;
      if (id) cart.setQty(id, event.target.value);
    }),
    on(root, 'submit', (event) => {
      const form = event.target.closest('[data-checkout]');
      if (!form) return;
      event.preventDefault();
      handleSubmit(form, {
        api,
        extend: (payload) => ({ ...payload, items: cart.getState().lines }),
        onSuccess: () => cart.clear(),
      });
    }),
  ];
  render();
  return () => offs.forEach((off) => off());
}
