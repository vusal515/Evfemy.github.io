import { html } from '../../render/html.js';
import { imageUrl } from '../../render/assets.js';
import { priceBlock, productBadges, productGrid } from '../../render/templates/product.js';
import { routes } from '../lib/routes.js';
import { formatCents, monthlyInstallment } from '../lib/money.js';
import { maxQty } from '../cart/cart.js';
import { slugify } from '../lib/text.js';
import { on } from '../lib/dom.js';

/** Product detail page: product.html?id=<product id>. */

export const INSTALLMENT_MONTHS = 12;
const LOW_STOCK = 5;

export function stockLabel(product) {
  if (product.stock <= 0) return { text: 'Stokda yoxdur', kind: 'out' };
  if (product.stock <= LOW_STOCK) return { text: `Son ${product.stock} ədəd`, kind: 'low' };
  return { text: 'Stokda var', kind: 'in' };
}

function setMeta(name, content) {
  document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', content);
}

function notFound() {
  return html`<nav class="breadcrumbs" aria-label="Səhifə yolu">
      <ol>
        <li><a href="${routes.home()}">Ana səhifə</a></li>
        <li><span aria-current="page">Məhsul tapılmadı</span></li>
      </ol>
    </nav>
    <h1 class="page__title">Məhsul tapılmadı</h1>
    <div class="empty-state">
      <p>Bu məhsul satışdan çıxarılıb və ya keçid səhvdir.</p>
      <a class="button button--primary" href="${routes.category('endirim')}">Endirimli məhsullara bax</a>
    </div>`;
}

export function productView(product, { catalog, inCart = 0 }) {
  const category = catalog.getCategory(product.category);
  const stock = stockLabel(product);
  const limit = maxQty(product);
  const canAdd = limit > 0;
  const related = catalog.related(product);

  return html`<nav class="breadcrumbs" aria-label="Səhifə yolu">
      <ol>
        <li><a href="${routes.home()}">Ana səhifə</a></li>
        <li><a href="${routes.category(category.slug)}">${category.label}</a></li>
        <li><a href="${routes.category(category.slug, slugify(product.group))}">${product.group}</a></li>
        <li><span aria-current="page">${product.name}</span></li>
      </ol>
    </nav>

    <article class="product-detail">
      <div class="product-detail__media">
        <img src="${imageUrl(product.image)}" alt="${product.alt}" width="800" height="800" />
        <div class="product-card__badges">${productBadges(product)}</div>
      </div>

      <div class="product-detail__info">
        <h1 class="page__title product-detail__title">${product.name}</h1>
        ${priceBlock(product, { className: 'price price--large' })}
        <p class="product-detail__installment">
          ${INSTALLMENT_MONTHS} aylıq hissəli ödənişlə ayda
          <strong>${formatCents(monthlyInstallment(product.price, INSTALLMENT_MONTHS))}</strong>
        </p>
        <p class="stock stock--${stock.kind}">${stock.text}</p>

        <div class="product-detail__buy">
          <div class="qty" role="group" aria-label="Miqdar">
            <button
              type="button"
              class="qty__button"
              data-qty-step="-1"
              aria-label="Azalt"
              ${canAdd ? '' : html`disabled`}
            >
              −
            </button>
            <input
              id="product-qty"
              class="qty__input"
              type="number"
              inputmode="numeric"
              min="1"
              max="${Math.max(limit, 1)}"
              value="1"
              aria-label="Miqdar"
              ${canAdd ? '' : html`disabled`}
            />
            <button
              type="button"
              class="qty__button"
              data-qty-step="1"
              aria-label="Artır"
              ${canAdd ? '' : html`disabled`}
            >
              +
            </button>
          </div>
          <button
            type="button"
            class="button button--primary product-detail__add"
            data-add-to-cart="${product.id}"
            data-qty-from="#product-qty"
            ${canAdd ? '' : html`disabled`}
          >
            ${canAdd ? 'Səbətə at' : 'Stokda yoxdur'}
          </button>
        </div>
        <p class="product-detail__in-cart" data-in-cart>${inCart ? `Səbətinizdə: ${inCart} ədəd` : ''}</p>

        <h2 class="product-detail__subtitle">Məhsul haqqında</h2>
        <p>${product.description}</p>
        <dl class="product-detail__specs">
          <div>
            <dt>Kateqoriya</dt>
            <dd>${category.label} › ${product.group}</dd>
          </div>
          <div>
            <dt>Növ</dt>
            <dd>${product.subcategory}</dd>
          </div>
          <div>
            <dt>Məhsul kodu</dt>
            <dd>${product.id}</dd>
          </div>
          <div>
            <dt>Çatdırılma</dt>
            <dd>Ödənişsiz</dd>
          </div>
        </dl>
      </div>
    </article>

    ${
      related.length
        ? html`<section class="related" aria-labelledby="related-heading">
            <h2 id="related-heading" class="index_page_slider_title">Oxşar məhsullar</h2>
            ${productGrid(related)}
          </section>`
        : ''
    }`;
}

/** Keeps the quantity input within 1..limit whatever the user types or clicks. */
function bindQuantity(root, limit) {
  const input = root.querySelector('#product-qty');
  if (!input) return () => {};
  const clamp = (value) => Math.min(Math.max(Number.parseInt(value, 10) || 1, 1), Math.max(limit, 1));
  return [
    on(input, 'change', () => {
      input.value = String(clamp(input.value));
    }),
    on(root, 'click', (event) => {
      const step = event.target.closest?.('[data-qty-step]');
      if (!step) return;
      input.value = String(clamp(Number(input.value) + Number(step.dataset.qtyStep)));
    }),
  ].reduce(
    (all, off) => () => (all(), off()),
    () => {},
  );
}

export function renderProductPage(root, { catalog, cart, searchString = location.search } = {}) {
  const id = new URLSearchParams(searchString).get('id');
  const product = id ? catalog.getProduct(id) : null;
  root.removeAttribute('aria-busy');

  if (!product) {
    root.innerHTML = String(notFound());
    document.title = 'Məhsul tapılmadı | Evfemiya';
    return () => {};
  }

  document.title = `${product.name} | Evfemiya`;
  setMeta('description', product.description);
  root.innerHTML = String(productView(product, { catalog, inCart: cart.qtyOf(product.id) }));

  const inCartLabel = root.querySelector('[data-in-cart]');
  const offCart = cart.subscribe(() => {
    const qty = cart.qtyOf(product.id);
    inCartLabel.textContent = qty ? `Səbətinizdə: ${qty} ədəd` : '';
  });
  const offQty = bindQuantity(root, maxQty(product));
  return () => {
    offCart();
    offQty();
  };
}
