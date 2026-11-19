import { html } from '../html.js';
import { imageUrl } from '../assets.js';
import { productCard } from './product.js';

/**
 * Each content variant maps to the carousel class used by the stylesheet and by
 * src/js/components/carousels.js. Adding a new section type means adding one
 * entry here and one carousel preset.
 */
export const VARIANT_CLASS = {
  'category-strip': 'under-head-class',
  hero: 'one-time',
  tiles: 'under-big',
  'promo-pair': 'under-big-two-autoplay',
  products: 'best-seller-area',
  'products-compact': 'star-area',
  gifts: 'gift-autoplay',
};

function image(item, { eager = false, className = 'media' } = {}) {
  return html`<img
    class="${className}"
    src="${imageUrl(item.image)}"
    alt="${item.alt}"
    loading="${eager ? 'eager' : 'lazy'}"
    decoding="async"
  />`;
}

const renderers = {
  'category-strip': (item) =>
    html`<a class="category-chip" href="${item.href}">
      ${image(item, { className: 'category-chip__image' })}
      <p>${item.label}</p>
    </a>`,

  hero: (item, index) => html`<a class="banner" href="${item.href}">${image(item, { eager: index === 0 })}</a>`,

  tiles: (item) => html`<a class="tile" href="${item.href}"><span class="tile__label">${item.label}</span></a>`,

  'promo-pair': (item) => html`<a class="card" href="${item.href}">${image(item)}</a>`,

  products: (item, _i, ctx) => html`<div class="card">${productCard(ctx.getProduct(item.product))}</div>`,

  'products-compact': (item, _i, ctx) => html`<div class="card">${productCard(ctx.getProduct(item.product))}</div>`,

  gifts: (item) =>
    html`<a class="card card--captioned" href="${item.href}">
      ${image(item)}
      <h3 class="card__caption">${item.label}</h3>
    </a>`,
};

/** `ctx.getProduct` resolves product references in product sections. */
export function renderSection(section, ctx = {}) {
  const render = renderers[section.variant];
  if (!render) throw new Error(`Unknown section variant "${section.variant}" in section "${section.id}"`);

  const headingId = `${section.id}-heading`;
  const style = section.layout ? `--media-height:${section.layout.height}px;--media-fit:${section.layout.fit}` : null;

  return html`<section
    class="home-section home-section--${section.variant}"
    id="${section.id}"
    aria-labelledby="${headingId}"
    ${style ? html`style="${style}"` : ''}
  >
    <h2 id="${headingId}" class="index_page_slider_title${section.headingHidden ? ' visually-hidden' : ''}">
      ${section.heading}
    </h2>
    <div class="${VARIANT_CLASS[section.variant]}" data-carousel="${section.variant}">
      ${section.items.map((item, i) => render(item, i, ctx))}
    </div>
  </section>`;
}

export function renderHome(content, ctx = {}) {
  return html`${content.sections.map((section) => renderSection(section, ctx))}`;
}
