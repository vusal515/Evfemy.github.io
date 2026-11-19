import { describe, expect, it } from 'vitest';
import products from '../src/data/products.json';
import navigation from '../src/data/navigation.json';
import { applyListing, createCatalog, isDiscounted } from '../src/js/lib/catalog.js';
import { routes } from '../src/js/lib/routes.js';
import { buildIndex, search } from '../src/js/lib/search.js';

const catalog = createCatalog(products, navigation);

describe('routes', () => {
  it('builds relative, encoded URLs', () => {
    expect(routes.category('metbex', 'bisirme')).toBe('category.html?c=metbex&sub=bisirme');
    expect(routes.category('endirim')).toBe('category.html?c=endirim');
    expect(routes.search('çay qaşığı')).toBe('category.html?q=%C3%A7ay+qa%C5%9F%C4%B1%C4%9F%C4%B1');
    expect(routes.product('corek-qabi')).toBe('product.html?id=corek-qabi');
  });
});

describe('catalog', () => {
  it('derives category slugs from the menu', () => {
    expect(catalog.getCategory('ev-tekstili')?.label).toBe('Ev Tekstili');
    expect(catalog.getCategory('nope')).toBeNull();
  });

  it('lists a category by main category and collections by tag', () => {
    expect(catalog.inCategory('elektronika').every((p) => p.category === 'elektronika')).toBe(true);
    const sale = catalog.inCategory('endirim');
    expect(sale.length).toBeGreaterThan(0);
    expect(sale.every(isDiscounted)).toBe(true);
  });

  it('matches a sub slug against a column or a single link', () => {
    const kettle = catalog.getProduct('paslanmayan-polad-caydan');
    expect(catalog.matchesSub(kettle, 'icki-hazirlama')).toBe(true);
    expect(catalog.matchesSub(kettle, 'caydan')).toBe(true);
    expect(catalog.matchesSub(kettle, 'bisirme')).toBe(false);
    expect(catalog.findSubLabel(catalog.getCategory('metbex'), 'duduklu-qazan')).toBe('Düdüklü Qazan');
  });

  it('offers filter chips only for columns that have products', () => {
    const chips = catalog.groupsWithProducts('sufre');
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((chip) => chip.count > 0)).toBe(true);
    expect(new Set(chips.map((c) => c.slug)).size).toBe(chips.length);
  });

  it('searches product names without special letters', () => {
    expect(catalog.searchProducts('caydan').map((p) => p.id)).toContain('paslanmayan-polad-caydan');
    expect(catalog.searchProducts('c')).toEqual([]);
  });

  it('suggests related products from the same category, same column first', () => {
    const kettle = catalog.getProduct('paslanmayan-polad-caydan');
    const related = catalog.related(kettle);
    expect(related.length).toBeLessThanOrEqual(4);
    expect(related.every((p) => p.category === kettle.category && p.id !== kettle.id)).toBe(true);
  });
});

describe('applyListing', () => {
  const list = [
    { id: 'a', price: 30, stock: 1 },
    { id: 'b', price: 10, oldPrice: 20, stock: 1 },
    { id: 'c', price: 5, stock: 0 },
    { id: 'd', price: 20, oldPrice: 25, stock: 1 },
  ];
  const ids = (opts) => applyListing(list, opts).map((p) => p.id);

  it('sorts by price and discount, always putting sold-out items last', () => {
    expect(ids({ sort: 'price-asc' })).toEqual(['b', 'd', 'a', 'c']);
    expect(ids({ sort: 'price-desc' })).toEqual(['a', 'd', 'b', 'c']);
    expect(ids({ sort: 'discount' })).toEqual(['b', 'd', 'a', 'c']);
    expect(ids({})).toEqual(['a', 'b', 'd', 'c']);
  });

  it('filters to discounted products and ignores unknown sorts', () => {
    expect(ids({ discountedOnly: true })).toEqual(['b', 'd']);
    expect(ids({ sort: 'bogus' })).toEqual(['a', 'b', 'd', 'c']);
  });

  it('does not reorder the input array', () => {
    const copy = [...list];
    applyListing(list, { sort: 'price-asc' });
    expect(list).toEqual(copy);
  });
});

describe('header search index', () => {
  const index = buildIndex(navigation, products);

  it('includes products with links to their pages', () => {
    const [first] = search(index, 'Çörək Qabı');
    expect(first).toEqual({ label: 'Çörək Qabı', path: ['Məhsul'], href: 'product.html?id=corek-qabi' });
  });

  it('links menu entries to category pages', () => {
    const hit = search(index, 'Düdüklü Qazan').find((r) => r.path[0] === 'Mətbəx');
    expect(hit.href).toBe('category.html?c=metbex&sub=duduklu-qazan');
  });
});
