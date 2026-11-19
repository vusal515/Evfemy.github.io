import { html } from '../../render/html.js';
import { productGrid } from '../../render/templates/product.js';
import { applyListing, SORTS } from '../lib/catalog.js';
import { routes } from '../lib/routes.js';
import { buildIndex, search } from '../lib/search.js';
import { on } from '../lib/dom.js';

/**
 * Category, collection (Endirim, Yenilər ...) and search results page.
 * Everything the user picks is kept in the URL, so a filtered list can be
 * bookmarked, shared and restored with the back button.
 *
 *   category.html?c=sufre&sub=servis-levazimatlari&sort=price-asc&discount=1
 *   category.html?q=çaydan
 */

export function readParams(searchString) {
  const params = new URLSearchParams(searchString);
  const sort = params.get('sort');
  return {
    c: params.get('c') ?? '',
    sub: params.get('sub') ?? '',
    q: (params.get('q') ?? '').trim(),
    sort: sort in SORTS ? sort : 'recommended',
    discountedOnly: params.get('discount') === '1',
  };
}

function writeParams(params) {
  const next = new URLSearchParams();
  if (params.c) next.set('c', params.c);
  if (params.sub) next.set('sub', params.sub);
  if (params.q) next.set('q', params.q);
  if (params.sort !== 'recommended') next.set('sort', params.sort);
  if (params.discountedOnly) next.set('discount', '1');
  const text = next.toString();
  return `${location.pathname}${text ? `?${text}` : ''}`;
}

/** Decides what the page shows; pure so it can be tested without a DOM. */
export function resolveView(catalog, params) {
  if (params.q) {
    return {
      kind: 'search',
      title: `"${params.q}" üzrə nəticələr`,
      crumbs: [{ label: 'Axtarış' }],
      products: catalog.searchProducts(params.q),
      chips: [],
    };
  }
  if (!params.c) {
    return {
      kind: 'all',
      title: 'Bütün məhsullar',
      crumbs: [{ label: 'Bütün məhsullar' }],
      products: catalog.products,
      chips: [],
    };
  }
  const category = catalog.getCategory(params.c);
  if (!category) return { kind: 'not-found' };

  const all = catalog.inCategory(category.slug);
  const chips = catalog.groupsWithProducts(category.slug);
  const subLabel = params.sub ? catalog.findSubLabel(category, params.sub) : null;
  if (!subLabel) {
    return {
      kind: 'category',
      title: category.label,
      crumbs: [{ label: category.label }],
      products: all,
      chips,
      category,
    };
  }
  const products = all.filter((p) => catalog.matchesSub(p, params.sub));
  return {
    kind: 'sub',
    title: subLabel,
    crumbs: [{ label: category.label, href: routes.category(category.slug) }, { label: subLabel }],
    products,
    fallback: products.length ? null : all,
    chips,
    category,
  };
}

const breadcrumbs = (crumbs) =>
  html`<nav class="breadcrumbs" aria-label="Səhifə yolu">
    <ol>
      <li><a href="${routes.home()}">Ana səhifə</a></li>
      ${crumbs.map((crumb) =>
        crumb.href
          ? html`<li><a href="${crumb.href}">${crumb.label}</a></li>`
          : html`<li><span aria-current="page">${crumb.label}</span></li>`,
      )}
    </ol>
  </nav>`;

function chipsBar(view, params) {
  if (!view.chips.length) return '';
  const current = params.sub;
  return html`<nav class="chips" aria-label="Alt kateqoriyalar">
    <a class="chip" href="${routes.category(view.category.slug)}" ${current ? '' : html`aria-current="page"`}>Hamısı</a>
    ${view.chips.map(
      (chip) =>
        html`<a
          class="chip"
          href="${routes.category(view.category.slug, chip.slug)}"
          ${chip.slug === current ? html`aria-current="page"` : ''}
          >${chip.title} <span class="chip__count">${chip.count}</span></a
        >`,
    )}
  </nav>`;
}

const toolbar = (params) =>
  html`<div class="listing-toolbar">
    <label class="listing-toolbar__field">
      <span>Sırala</span>
      <select name="sort" data-listing-sort>
        ${Object.entries(SORTS).map(
          ([value, { label }]) =>
            html`<option value="${value}" ${value === params.sort ? html`selected` : ''}>${label}</option>`,
        )}
      </select>
    </label>
    <label class="checkbox listing-toolbar__field">
      <input type="checkbox" data-listing-discount ${params.discountedOnly ? html`checked` : ''} />
      Yalnız endirimli
    </label>
  </div>`;

function listing(view, params, catalog) {
  const products = applyListing(view.products, params);
  const count = html`<p class="listing-count" role="status">${products.length} məhsul</p>`;

  if (products.length) return html`${count}${productGrid(products)}`;

  if (view.kind === 'search') {
    const categories = search(buildIndex(catalog.navigation), params.q, 6);
    return html`${count}
      <div class="empty-state">
        <p>"${params.q}" adlı məhsul tapılmadı. Yazılışı yoxlayın və ya kateqoriyalara baxın.</p>
        ${
          categories.length
            ? html`<ul class="empty-state__links">
                ${categories.map((c) => html`<li><a href="${c.href}">${c.label}</a></li>`)}
              </ul>`
            : ''
        }
      </div>`;
  }
  if (view.fallback?.length) {
    return html`<div class="empty-state" role="status">
        <p>Bu alt kateqoriyada hələ məhsul yoxdur. ${view.category.label} bölməsindəki digər məhsullar:</p>
      </div>
      ${productGrid(applyListing(view.fallback, params))}`;
  }
  return html`${count}
    <div class="empty-state">
      <p>${params.discountedOnly ? 'Seçilmiş filtrə uyğun məhsul yoxdur.' : 'Bu bölmədə hələ məhsul yoxdur.'}</p>
      <a class="button button--secondary" href="${routes.category('endirim')}">Endirimli məhsullara bax</a>
    </div>`;
}

function notFound() {
  return html`${breadcrumbs([{ label: 'Kateqoriya tapılmadı' }])}
    <h1 class="page__title">Kateqoriya tapılmadı</h1>
    <div class="empty-state">
      <p>Bu ünvanda kateqoriya yoxdur. Menyudan seçin və ya ana səhifəyə qayıdın.</p>
      <a class="button button--primary" href="${routes.home()}">Ana səhifə</a>
    </div>`;
}

export function renderCategoryPage(root, { catalog, searchString = location.search, history = window.history } = {}) {
  const params = readParams(searchString);
  const view = resolveView(catalog, params);
  root.removeAttribute('aria-busy');

  if (view.kind === 'not-found') {
    root.innerHTML = String(notFound());
    document.title = 'Kateqoriya tapılmadı | Evfemiya';
    return () => {};
  }

  document.title = `${view.title} | Evfemiya`;
  root.innerHTML = String(
    html`${breadcrumbs(view.crumbs)}
      <h1 class="page__title">${view.title}</h1>
      ${chipsBar(view, params)} ${toolbar(params)}
      <div class="listing" data-listing>${listing(view, params, catalog)}</div>`,
  );

  const list = root.querySelector('[data-listing]');
  const refresh = () => {
    list.innerHTML = String(listing(view, params, catalog));
    history.replaceState(null, '', writeParams(params));
  };
  const offs = [
    on(root.querySelector('[data-listing-sort]'), 'change', (event) => {
      params.sort = event.target.value;
      refresh();
    }),
    on(root.querySelector('[data-listing-discount]'), 'change', (event) => {
      params.discountedOnly = event.target.checked;
      refresh();
    }),
  ];
  return () => offs.forEach((off) => off());
}
