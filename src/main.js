import 'slick-carousel/slick/slick.css';
import './styles/main.css';

import { initCarousels } from './js/components/carousels.js';
import { initSearch } from './js/components/search.js';
import { initAccordions } from './js/components/disclosure.js';
import { initMobileOverlays, initModals } from './js/components/overlays.js';
import { initTabs } from './js/components/tabs.js';
import { initForms } from './js/components/forms.js';
import { initCurrentYear, initScrollEffects } from './js/components/page-chrome.js';
import { initAddToCart, initCartBadge, initCartSync } from './js/components/cart-ui.js';
import { cart, catalog } from './js/services/shop.js';

/**
 * Each feature initialises independently: one failure is logged and the rest
 * of the page keeps working. (In the original site a single missing element
 * threw in header.js and silently disabled every header feature.)
 */
const features = {
  carousels: initCarousels,
  search: initSearch,
  accordions: initAccordions,
  overlays: initMobileOverlays,
  modals: initModals,
  tabs: initTabs,
  forms: initForms,
  scroll: initScrollEffects,
  year: initCurrentYear,
  cartBadge: (root) => initCartBadge(root, cart),
  addToCart: (root) => initAddToCart(root, cart, { getProduct: catalog.getProduct }),
  cartSync: () => initCartSync(cart),
};

for (const [name, init] of Object.entries(features)) {
  try {
    init(document);
  } catch (error) {
    console.error(`[init] "${name}" failed`, error);
  }
}

const pageRoot = (name) => document.querySelector(`[data-${name}-root]`);

/**
 * Page-specific code is loaded on demand, so the home page does not download
 * the category, product or cart modules.
 */
const pages = {
  category: async () => (await import('./js/pages/category.js')).renderCategoryPage(pageRoot('category'), { catalog }),
  product: async () =>
    (await import('./js/pages/product.js')).renderProductPage(pageRoot('product'), { catalog, cart }),
  cart: async () => (await import('./js/pages/cart.js')).renderCartPage(pageRoot('cart'), { catalog, cart }),
};

const pageName = document.body.dataset.page;
pages[pageName]?.().catch((error) => {
  console.error(`[page] "${pageName}" failed`, error);
  const root = pageRoot(pageName);
  root?.removeAttribute('aria-busy');
  root?.querySelector('.page__loading')?.replaceChildren('Səhifə yüklənmədi. Səhifəni yeniləyin.');
});
