// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'node_modules', '.cache', 'build-test');
let doc;
let html;

beforeAll(async () => {
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: OUT, emptyOutDir: true, sourcemap: false } });
  html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  doc = new JSDOM(html).window.document;
}, 60_000);

describe('production build', () => {
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

  it('declares the page language and a single h1', () => {
    expect(doc.documentElement.lang).toBe('az');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
  });
});
