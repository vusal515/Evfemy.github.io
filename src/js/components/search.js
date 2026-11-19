import navigation from '../../data/navigation.json';
import products from '../../data/products.json';
import { buildIndex, search } from '../lib/search.js';
import { qs, qsa, on } from '../lib/dom.js';

const index = buildIndex(navigation, products);

function renderResults(list, results, query) {
  list.replaceChildren();
  if (query.trim().length < 2) return;
  if (!results.length) {
    const empty = document.createElement('li');
    empty.className = 'search_results__empty';
    empty.textContent = `"${query}" üzrə nəticə tapılmadı.`;
    list.append(empty);
    return;
  }
  for (const result of results) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = result.href;
    link.textContent = result.label;
    if (result.path.length) {
      const crumb = document.createElement('span');
      crumb.className = 'search_results__path';
      crumb.textContent = result.path.join(' › ');
      link.append(crumb);
    }
    item.append(link);
    list.append(item);
  }
}

/** Wires one search widget (desktop or mobile); markup is matched via data attributes. */
export function initSearchWidget(container) {
  const input = qs('[data-search-input]', container);
  const panel = qs('[data-search-panel]', container);
  const list = qs('[data-search-results]', container);
  const form = qs('[data-search-form]', container);
  if (!input || !panel || !list) return () => {};

  const isOverlay = container.id === 'mobile-search';
  const setOpen = (open) => {
    if (isOverlay) return; // the overlay itself is opened by mobile-search.js
    panel.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  };
  const update = () => renderResults(list, search(index, input.value), input.value);

  const cleanups = [
    on(input, 'focus', () => setOpen(true)),
    on(input, 'input', update),
    // The form submits to category.html?q=... (works without JavaScript too);
    // too-short queries stay on the page and keep the suggestions open.
    on(form, 'submit', (event) => {
      if (input.value.trim().length >= 2) return;
      event.preventDefault();
      update();
      setOpen(true);
    }),
    on(container, 'keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        input.blur();
      }
    }),
    on(document, 'click', (event) => {
      if (!container.contains(event.target)) setOpen(false);
    }),
    ...qsa('[data-search-tag]', container).map((tag) =>
      on(tag, 'click', () => {
        input.value = tag.textContent.trim();
        update();
        input.focus();
      }),
    ),
  ];
  return () => cleanups.forEach((off) => off());
}

export function initSearch(root = document) {
  qsa('[data-search]', root).forEach(initSearchWidget);
}
