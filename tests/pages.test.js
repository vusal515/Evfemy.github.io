import { beforeEach, describe, expect, it, vi } from 'vitest';
import products from '../src/data/products.json';
import navigation from '../src/data/navigation.json';
import { createCatalog } from '../src/js/lib/catalog.js';
import { createCartStore } from '../src/js/cart/store.js';
import { readParams, renderCategoryPage, resolveView } from '../src/js/pages/category.js';
import { renderProductPage, stockLabel } from '../src/js/pages/product.js';
import { renderCartPage } from '../src/js/pages/cart.js';
import { initAddToCart, initCartBadge } from '../src/js/components/cart-ui.js';
import { productCard } from '../src/render/templates/product.js';
import { ApiNotConfiguredError } from '../src/js/services/api.js';

const catalog = createCatalog(products, navigation);
const newCart = () => createCartStore({ getProduct: catalog.getProduct, storage: null });
const mount = () => {
  document.body.innerHTML = '<main><div data-root></div></main><div data-toast hidden></div>';
  return document.querySelector('[data-root]');
};
const texts = (root, selector) => [...root.querySelectorAll(selector)].map((el) => el.textContent.trim());
const fakeHistory = () => ({ replaceState: vi.fn() });

describe('product card', () => {
  it('links to the product page and disables buying when sold out', () => {
    const soldOut = products.find((p) => p.stock === 0);
    const template = document.createElement('template');
    template.innerHTML = String(productCard(soldOut));
    expect(template.content.querySelector('a').getAttribute('href')).toBe(`product.html?id=${soldOut.id}`);
    expect(template.content.querySelector('[data-add-to-cart]').disabled).toBe(true);
    expect(template.content.querySelector('.badge--muted').textContent).toBe('Stokda yoxdur');
  });
});

describe('category page', () => {
  it('reads and sanitises URL parameters', () => {
    expect(readParams('?c=sufre&sort=price-asc&discount=1')).toMatchObject({
      c: 'sufre',
      sort: 'price-asc',
      discountedOnly: true,
    });
    expect(readParams('?sort=evil').sort).toBe('recommended');
  });

  it('resolves categories, sub-categories, searches and unknown slugs', () => {
    expect(resolveView(catalog, readParams('?c=nope')).kind).toBe('not-found');
    expect(resolveView(catalog, readParams('?q=caydan')).kind).toBe('search');
    const sub = resolveView(catalog, readParams('?c=metbex&sub=duduklu-qazan'));
    expect(sub.products).toEqual([]);
    expect(sub.fallback.length).toBeGreaterThan(0);
  });

  it('renders a category with chips, a count and product cards', () => {
    const root = mount();
    renderCategoryPage(root, { catalog, searchString: '?c=sufre', history: fakeHistory() });
    expect(root.querySelector('h1').textContent).toBe('Süfrə');
    expect(document.title).toBe('Süfrə | Evfemiya');
    expect(root.querySelector('.chip[aria-current]').textContent).toBe('Hamısı');
    const cards = root.querySelectorAll('.product-card');
    expect(root.querySelector('.listing-count').textContent).toBe(`${cards.length} məhsul`);
    expect(root.hasAttribute('aria-busy')).toBe(false);
  });

  it('re-sorts and filters in place and keeps the choice in the URL', () => {
    const root = mount();
    const history = fakeHistory();
    renderCategoryPage(root, { catalog, searchString: '?c=sufre', history });
    const sort = root.querySelector('[data-listing-sort]');
    sort.value = 'price-asc';
    sort.dispatchEvent(new Event('change'));
    const prices = texts(root, '.price__current').map((t) => Number(t.replace(/[^\d,]/g, '').replace(',', '.')));
    const inStock = prices.slice(0, -1); // the sold-out item is listed last
    expect(inStock).toEqual([...inStock].sort((a, b) => a - b));
    expect(history.replaceState).toHaveBeenLastCalledWith(null, '', expect.stringContaining('sort=price-asc'));

    const discount = root.querySelector('[data-listing-discount]');
    discount.checked = true;
    discount.dispatchEvent(new Event('change'));
    expect(root.querySelectorAll('.badge--sale').length).toBe(root.querySelectorAll('.product-card').length);
  });

  it('shows a helpful empty state for searches without results', () => {
    const root = mount();
    renderCategoryPage(root, { catalog, searchString: '?q=qazan', history: fakeHistory() });
    expect(root.querySelector('h1').textContent).toBe('"qazan" üzrə nəticələr');
    renderCategoryPage(root, { catalog, searchString: '?q=zzzz', history: fakeHistory() });
    expect(root.querySelector('.empty-state').textContent).toMatch(/tapılmadı/);
  });

  it('escapes the search text it echoes back', () => {
    const root = mount();
    renderCategoryPage(root, { catalog, searchString: '?q=<img src=x onerror=alert(1)>', history: fakeHistory() });
    expect(root.querySelector('img[onerror]')).toBeNull();
    expect(root.querySelector('h1').textContent).toContain('<img');
  });
});

describe('product page', () => {
  it('shows price, discount, instalment and stock for a product', () => {
    const root = mount();
    renderProductPage(root, { catalog, cart: newCart(), searchString: '?id=paslanmayan-polad-caydan' });
    expect(root.querySelector('h1').textContent).toBe('Paslanmayan Polad Çaydan');
    expect(root.querySelector('.price__current').textContent).toContain('49,90 ₼');
    expect(root.querySelector('.badge--sale').textContent).toBe('-29%');
    expect(root.querySelector('.product-detail__installment').textContent).toContain('4,16 ₼');
    expect(root.querySelectorAll('.related .product-card').length).toBeGreaterThan(0);
  });

  it('keeps the quantity between 1 and the stock limit', () => {
    const root = mount();
    renderProductPage(root, { catalog, cart: newCart(), searchString: '?id=ag-cini-yemek-desti' });
    const input = root.querySelector('#product-qty');
    const plus = root.querySelector('[data-qty-step="1"]');
    for (let i = 0; i < 10; i += 1) plus.click();
    expect(input.value).toBe('4');
    input.value = '-3';
    input.dispatchEvent(new Event('change'));
    expect(input.value).toBe('1');
  });

  it('labels stock levels', () => {
    expect(stockLabel({ stock: 0 }).kind).toBe('out');
    expect(stockLabel({ stock: 3 }).text).toBe('Son 3 ədəd');
    expect(stockLabel({ stock: 30 }).kind).toBe('in');
  });

  it('handles unknown products', () => {
    const root = mount();
    renderProductPage(root, { catalog, cart: newCart(), searchString: '?id=nope' });
    expect(root.querySelector('h1').textContent).toBe('Məhsul tapılmadı');
  });
});

describe('add to cart and header badge', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a data-cart-link><span data-cart-count hidden></span></a>
      <input id="qty" value="2">
      <button data-add-to-cart="corek-qabi" data-qty-from="#qty">Səbətə at</button>
      <div data-toast hidden></div>`;
  });

  it('adds the chosen quantity, updates the badge and announces it', () => {
    const cart = newCart();
    initCartBadge(document, cart);
    initAddToCart(document, cart, { getProduct: catalog.getProduct });
    document.querySelector('[data-add-to-cart]').click();
    expect(cart.qtyOf('corek-qabi')).toBe(2);
    const badge = document.querySelector('[data-cart-count]');
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe('2');
    expect(document.querySelector('[data-cart-link]').getAttribute('aria-label')).toBe('Səbət, 2 məhsul');
    expect(document.querySelector('[data-toast]').textContent).toContain('səbətə əlavə edildi');
  });
});

describe('cart page', () => {
  it('shows an empty state when nothing is in the cart', () => {
    const root = mount();
    renderCartPage(root, { catalog, cart: newCart() });
    expect(root.textContent).toContain('Səbətiniz boşdur');
  });

  it('updates quantities and totals, and removes lines', () => {
    const root = mount();
    const cart = newCart();
    cart.add('paslanmayan-polad-caydan', 1);
    cart.add('corek-qabi', 1);
    renderCartPage(root, { catalog, cart });
    expect(root.querySelector('.totals__grand dd').textContent).toBe('69,80 ₼');

    root.querySelector('[data-cart-action="inc"][data-id="corek-qabi"]').click();
    expect(root.querySelector('.totals__grand dd').textContent).toBe('89,70 ₼');
    expect(root.querySelector('.totals__savings dd').textContent).toBe('-36,00 ₼');

    root.querySelector('[data-cart-action="remove"][data-id="paslanmayan-polad-caydan"]').click();
    expect(root.querySelectorAll('.cart-line')).toHaveLength(1);
  });

  it('asks before clearing the cart', () => {
    const root = mount();
    const cart = newCart();
    cart.add('corek-qabi', 1);
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderCartPage(root, { catalog, cart, confirm });
    root.querySelector('[data-cart-action="clear"]').click();
    expect(cart.count()).toBe(1);
    root.querySelector('[data-cart-action="clear"]').click();
    expect(cart.count()).toBe(0);
  });

  it('validates checkout details and sends the cart lines with them', async () => {
    const root = mount();
    const cart = newCart();
    cart.add('corek-qabi', 2);
    const api = { submitForm: vi.fn().mockResolvedValue({ orderId: 1 }) };
    renderCartPage(root, { catalog, cart, api });

    const form = root.querySelector('[data-checkout]');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(api.submitForm).not.toHaveBeenCalled();

    form.elements.fullName.value = 'Test İstifadəçi';
    form.elements.phone.value = '050 123 45 67';
    form.elements.address.value = 'Bakı, Nizami küçəsi 10';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(cart.count()).toBe(0));
    expect(api.submitForm).toHaveBeenCalledWith('checkout', {
      fullName: 'Test İstifadəçi',
      phone: '050 123 45 67',
      address: 'Bakı, Nizami küçəsi 10',
      items: [{ id: 'corek-qabi', qty: 2 }],
    });
  });

  it('keeps the cart when no back end is configured', async () => {
    const root = mount();
    const cart = newCart();
    cart.add('corek-qabi', 1);
    const api = { submitForm: vi.fn().mockRejectedValue(new ApiNotConfiguredError()) };
    renderCartPage(root, { catalog, cart, api });
    const form = root.querySelector('[data-checkout]');
    form.elements.fullName.value = 'Test İstifadəçi';
    form.elements.phone.value = '+994501234567';
    form.elements.address.value = 'Bakı, Nizami küçəsi 10';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(form.querySelector('[data-form-status]').dataset.kind).toBe('info'));
    expect(cart.count()).toBe(1);
  });
});
