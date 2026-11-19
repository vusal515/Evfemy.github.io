// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'node_modules', '.cache', 'build-test');
const PAGES = ['index.html', 'category.html', 'product.html', 'cart.html'];
const pages = {};
let doc;
let html;

beforeAll(async () => {
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: OUT, emptyOutDir: true, sourcemap: false } });
  for (const page of PAGES) {
    const source = fs.readFileSync(path.join(OUT, page), 'utf8');
    pages[page] = { html: source, doc: new JSDOM(source).window.document };
  }
  ({ html, doc } = pages['index.html']);
}, 60_000);

describe.each(PAGES)('production build: %s', (page) => {
  it('exists with the shared header, footer and its own page script', () => {
    const { doc: d, html: h } = pages[page];
    expect(d.querySelector('.desktop_header')).not.toBeNull();
    expect(d.querySelector('.footer')).not.toBeNull();
    expect(d.querySelector('script[type="module"][src^="./assets/"]')).not.toBeNull();
    expect(h).not.toMatch(/@render/);
  });

  it('uses only relative local URLs that exist in the output', () => {
    const { doc: d } = pages[page];
    const refs = [...d.querySelectorAll('[src], link[href]')]
      .map((el) => el.getAttribute('src') ?? el.getAttribute('href'))
      .filter((ref) => ref && !/^(https?:|data:|#)/.test(ref));
    expect(refs.filter((ref) => ref.startsWith('/'))).toEqual([]);
    expect(refs.filter((ref) => !fs.existsSync(path.join(OUT, ref)))).toEqual([]);
  });

  it('declares the language, a body page name and exactly one h1', () => {
    const { doc: d } = pages[page];
    expect(d.documentElement.lang).toBe('az');
    expect(d.body.dataset.page).toBeTruthy();
    expect(d.querySelectorAll('h1')).toHaveLength(1);
  });
});

describe('production build: home page', () => {
  it('resolves every local asset referenced by the page', () => {
    const refs = [...doc.querySelectorAll('[src], link[href]')]
      .map((el) => el.getAttribute('src') ?? el.getAttribute('href'))
      .filter((ref) => ref && !/^(https?:|data:|#)/.test(ref));
    expect(refs.length).toBeGreaterThan(40);
    const missing = refs.filter((ref) => !fs.existsSync(path.join(OUT, ref)));
    expect(missing).toEqual([]);
  });

  it('uses relative URLs so it works under a GitHub Pages sub-path', () => {
    const absolute = [...doc.querySelectorAll('[src], link[href]')]
      .map((el) => el.getAttribute('src') ?? el.getAttribute('href'))
      .filter((ref) => ref.startsWith('/') && !ref.startsWith('//'));
    expect(absolute).toEqual([]);
  });

  it('contains no third-party trackers or leftover references to the old back end', () => {
    for (const pattern of [
      /googletagmanager/,
      /gtag\(/,
      /livechatinc/,
      /recaptcha/,
      /krc\.az/,
      /(href|action|src)="\/?[^":]*\.php/,
    ]) {
      expect(html).not.toMatch(pattern);
    }
  });

  it('leaves no unrendered placeholders', () => {
    expect(html).not.toMatch(/@render/);
  });

  it('gives every image an alt attribute and every section a heading', () => {
    expect([...doc.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt'))).toEqual([]);
    for (const section of doc.querySelectorAll('main section')) {
      const id = section.getAttribute('aria-labelledby');
      expect(doc.getElementById(id)?.textContent.trim()).toBeTruthy();
    }
  });

  it('has unique ids', () => {
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('links product cards to product pages and the header to the cart', () => {
    const productLinks = [...doc.querySelectorAll('.product-card__link')].map((a) => a.getAttribute('href'));
    expect(productLinks.length).toBeGreaterThan(10);
    productLinks.forEach((href) => expect(href).toMatch(/^product\.html\?id=[a-z0-9-]+$/));
    expect(doc.querySelector('[data-cart-link]').getAttribute('href')).toBe('cart.html');
  });

  it('has far fewer placeholder links than the original page', () => {
    const links = [...doc.querySelectorAll('a[href]')];
    const placeholders = links.filter((a) => a.getAttribute('href') === '#');
    expect(placeholders.length / links.length).toBeLessThan(0.1);
  });
});
