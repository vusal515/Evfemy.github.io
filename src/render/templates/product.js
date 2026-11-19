import { html } from '../html.js';
import { imageUrl } from '../assets.js';
import { routes } from '../../js/lib/routes.js';
import { discountPercent, formatPrice } from '../../js/lib/money.js';

/**
 * Product markup shared by the build-time home page and the client-rendered
 * category, product and cart pages, so a card looks the same everywhere.
 */

export function priceBlock(product, { className = 'price' } = {}) {
  const discount = discountPercent(product.price, product.oldPrice);
  return html`<p class="${className}">
    <span class="price__current"><span class="visually-hidden">Qiymət: </span>${formatPrice(product.price)}</span>
    ${
      discount
        ? html`<s class="price__old"
            ><span class="visually-hidden">Köhnə qiymət: </span>${formatPrice(product.oldPrice)}</s
          >`
        : ''
    }
  </p>`;
}

export function productBadges(product) {
  const discount = discountPercent(product.price, product.oldPrice);
  return html`${discount ? html`<span class="badge badge--sale">-${discount}%</span>` : ''}${
    product.stock > 0 ? '' : html`<span class="badge badge--muted">Stokda yoxdur</span>`
  }`;
}

export function productCard(product, { eager = false } = {}) {
  const inStock = product.stock > 0;
  return html`<article class="product-card">
    <a class="product-card__link" href="${routes.product(product.id)}">
      <div class="product-card__media">
        <img
          src="${imageUrl(product.image)}"
          alt="${product.alt}"
          loading="${eager ? 'eager' : 'lazy'}"
          decoding="async"
          width="400"
          height="400"
        />
        <div class="product-card__badges">${productBadges(product)}</div>
      </div>
      <h3 class="product-card__title">${product.name}</h3>
    </a>
    ${priceBlock(product)}
    <button
      type="button"
      class="button button--primary product-card__add"
      data-add-to-cart="${product.id}"
      ${inStock ? '' : html`disabled`}
    >
      ${inStock ? 'Səbətə at' : 'Stokda yoxdur'}
    </button>
  </article>`;
}

export const productGrid = (products) =>
  html`<ul class="product-grid">
    ${products.map((p) => html`<li>${productCard(p)}</li>`)}
  </ul>`;
