import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkInternalHref,
  ContentError,
  validateFooter,
  validateHome,
  validateNavigation,
  validateProducts,
} from '../src/render/validate.js';
import { loadContent } from '../src/render/vite-plugin-content.js';
import { createCatalog } from '../src/js/lib/catalog.js';
import navigation from '../src/data/navigation.json';
import products from '../src/data/products.json';

const ROOT = path.resolve(import.meta.dirname, '..');

const catalog = createCatalog(products, navigation);

const validSection = () => ({
  id: 'a',
  variant: 'promo-pair',
  heading: 'Promos',
  items: [{ image: 'banners/x.webp', alt: 'A promo', href: '#' }],
});

describe('validateHome', () => {
  it('accepts the content shipped in src/data, including image files on disk', () => {
    expect(() => loadContent(ROOT)).not.toThrow();
  });

  it('collects every problem in one error', () => {
    const bad = { sections: [{ ...validSection(), variant: 'carousel', heading: '' }] };
    try {
      validateHome(bad);
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ContentError);
      expect(error.problems).toEqual([
        'sections[0] (a): unknown variant "carousel"',
        'sections[0] (a): "heading" is required for accessibility',
      ]);
    }
  });

  it('rejects duplicate ids', () => {
    expect(() => validateHome({ sections: [validSection(), validSection()] })).toThrow(/duplicate id/);
  });

  it('requires alt text for image-only items', () => {
    const section = validSection();
    section.items[0].alt = '';
    expect(() => validateHome({ sections: [section] })).toThrow(/descriptive "alt"/);
  });

  it('reports images missing from public/', () => {
    const section = validSection();
    section.items[0].image = 'banners/does-not-exist.webp';
    expect(() => validateHome({ sections: [section] }, { publicDir: path.join(ROOT, 'public') })).toThrow(
      /not found in public\/images/,
    );
  });

  it('requires product sections to reference existing products', () => {
    const section = { id: 'p', variant: 'products', heading: 'P', items: [{ product: 'no-such-product' }] };
    expect(() => validateHome({ sections: [section] }, { catalog })).toThrow(/unknown product "no-such-product"/);
  });

  it('rejects links to categories that do not exist', () => {
    const section = validSection();
    section.items[0].href = 'category.html?c=sufre&sub=not-a-sub';
    expect(() => validateHome({ sections: [section] }, { catalog })).toThrow(/unknown sub-category "not-a-sub"/);
  });

  it('validates layout values', () => {
    const section = { ...validSection(), layout: { height: -1, fit: 'stretch' } };
    expect(() => validateHome({ sections: [section] })).toThrow(/layout.height[\s\S]*layout.fit/);
  });
});

describe('validateNavigation / validateFooter', () => {
  it('rejects columns without a title', () => {
    expect(() => validateNavigation([{ label: 'A', columns: [{ title: '', links: [] }] }])).toThrow(
      /"title" is required/,
    );
  });

  it('rejects empty footer groups', () => {
    expect(() => validateFooter([{ title: 'A', links: [] }])).toThrow(/non-empty array/);
  });
});

describe('checkInternalHref', () => {
  it('accepts known categories, sub-categories, products and searches', () => {
    expect(checkInternalHref('category.html?c=metbex&sub=bisirme', catalog)).toBeNull();
    expect(checkInternalHref('category.html?c=endirim', catalog)).toBeNull();
    expect(checkInternalHref('product.html?id=corek-qabi', catalog)).toBeNull();
    expect(checkInternalHref('category.html?q=anything', catalog)).toBeNull();
    expect(checkInternalHref('#', catalog)).toBeNull();
  });

  it('reports broken internal links', () => {
    expect(checkInternalHref('category.html?c=nope', catalog)).toMatch(/unknown category/);
    expect(checkInternalHref('product.html?id=nope', catalog)).toMatch(/unknown product/);
  });

  it('checks footer links too', () => {
    const footer = [{ title: 'A', links: [{ label: 'X', href: 'category.html?c=nope' }] }];
    expect(() => validateFooter(footer, { catalog })).toThrow(/unknown category/);
  });
});

describe('validateProducts', () => {
  const product = () => structuredClone(products.find((p) => p.id === 'corek-qabi'));

  it('accepts the shipped catalog', () => {
    expect(() => validateProducts(products, { navigation, publicDir: path.join(ROOT, 'public') })).not.toThrow();
  });

  it('rejects duplicate ids and bad prices', () => {
    const cheap = { ...product(), oldPrice: 1 };
    expect(() => validateProducts([product(), cheap], { navigation })).toThrow(
      /duplicate id[\s\S]*"oldPrice" must be higher/,
    );
  });

  it('requires the category path to exist in the menu', () => {
    const p = { ...product(), group: 'Uydurma Bölmə' };
    expect(() => validateProducts([p], { navigation })).toThrow(/is not a column of "Süfrə"/);
  });

  it('keeps the "endirim" tag in sync with oldPrice', () => {
    const p = { ...product(), tags: [] };
    expect(() => validateProducts([p], { navigation })).toThrow(/"endirim" tag and "oldPrice"/);
  });

  it('only allows highlighted menu entries as tags', () => {
    const p = { ...product(), tags: ['endirim', 'sufre'] };
    expect(() => validateProducts([p], { navigation })).toThrow(/unknown tag "sufre"/);
  });
});
