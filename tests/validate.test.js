import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContentError, validateFooter, validateHome, validateNavigation } from '../src/render/validate.js';
import { loadContent } from '../src/render/vite-plugin-content.js';

const ROOT = path.resolve(import.meta.dirname, '..');

const validSection = () => ({
  id: 'a',
  variant: 'products',
  heading: 'Products',
  items: [{ image: 'products/x.webp', alt: 'A product', href: '#' }],
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
    section.items[0].image = 'products/does-not-exist.webp';
    expect(() => validateHome({ sections: [section] }, { publicDir: path.join(ROOT, 'public') })).toThrow(
      /not found in public\/images/,
    );
  });

  it('validates layout values', () => {
    const section = { ...validSection(), layout: { height: -1, fit: 'stretch' } };
    expect(() => validateHome({ sections: [section] })).toThrow(/layout.height[\s\S]*layout.fit/);
  });
});

describe('validateNavigation / validateFooter', () => {
  it('rejects columns without a title', () => {
    expect(() => validateNavigation([{ label: 'A', href: '#', columns: [{ title: '', links: [] }] }])).toThrow(
      /"title" is required/,
    );
  });

  it('rejects empty footer groups', () => {
    expect(() => validateFooter([{ title: 'A', links: [] }])).toThrow(/non-empty array/);
  });
});
