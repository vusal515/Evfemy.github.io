import { describe, expect, it } from 'vitest';
import { renderSection, VARIANT_CLASS } from '../src/render/templates/home.js';
import { renderDesktopNav, renderMobileNav } from '../src/render/templates/navigation.js';
import { renderFooterAccordion } from '../src/render/templates/footer.js';

const parse = (markup) => {
  const template = document.createElement('template');
  template.innerHTML = String(markup);
  return template.content;
};

describe('renderSection', () => {
  const section = {
    id: 'gifts',
    variant: 'gifts',
    heading: 'Hədiyyələr',
    headingHidden: false,
    layout: { height: 400, fit: 'cover' },
    items: [
      { label: 'Anama Hədiyyə', image: 'gifts/a.webp', alt: '', href: '#' },
      { label: 'Atama Hədiyyə', image: 'gifts/b.webp', alt: '', href: '#' },
    ],
  };

  it('renders a labelled section with the carousel class for its variant', () => {
    const el = parse(renderSection(section)).querySelector('section');
    expect(el.getAttribute('aria-labelledby')).toBe('gifts-heading');
    expect(el.querySelector('h2').textContent.trim()).toBe('Hədiyyələr');
    expect(el.querySelector(`.${VARIANT_CLASS.gifts}`).dataset.carousel).toBe('gifts');
    expect(el.getAttribute('style')).toBe('--media-height:400px;--media-fit:cover');
  });

  it('lazy-loads images and keeps alt attributes', () => {
    const imgs = parse(renderSection(section)).querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    imgs.forEach((img) => {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.hasAttribute('alt')).toBe(true);
    });
  });

  it('loads only the first hero image eagerly', () => {
    const hero = {
      ...section,
      id: 'hero',
      variant: 'hero',
      items: section.items.map((i) => ({ ...i, label: undefined, alt: 'x' })),
    };
    const loading = [...parse(renderSection(hero)).querySelectorAll('img')].map((i) => i.getAttribute('loading'));
    expect(loading).toEqual(['eager', 'lazy']);
  });

  it('hides headings visually when requested', () => {
    const h2 = parse(renderSection({ ...section, headingHidden: true })).querySelector('h2');
    expect(h2.classList.contains('visually-hidden')).toBe(true);
  });

  it('throws on an unknown variant', () => {
    expect(() => renderSection({ ...section, variant: 'nope' })).toThrow(/Unknown section variant "nope"/);
  });
});

describe('navigation templates', () => {
  const nav = [
    {
      label: 'Mətbəx',
      href: '#',
      highlight: false,
      columns: [{ title: 'Qazan', links: [{ label: 'Düdüklü Qazan', href: '#' }] }],
    },
    { label: 'Endirim', href: '#', highlight: true, columns: [] },
  ];

  it('renders a mega menu only for categories with columns', () => {
    const items = parse(renderDesktopNav(nav)).querySelectorAll('.header_third_list > li');
    expect(items[0].querySelector('.category_drop_down')).not.toBeNull();
    expect(items[1].querySelector('.category_drop_down')).toBeNull();
    expect(items[1].querySelector('.icon--star')).not.toBeNull();
  });

  it('renders mobile categories with sub-menus as accessible accordions', () => {
    const button = parse(renderMobileNav(nav)).querySelector('[data-accordion]');
    const panelId = button.getAttribute('aria-controls');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panelId).toBe('mobile-cat-metbex');
  });

  it('renders footer groups as collapsed accordions', () => {
    const fragment = parse(
      renderFooterAccordion([{ title: 'Texniki Dəstək', links: [{ label: 'Yardım', href: '#' }] }]),
    );
    const region = fragment.querySelector('.ml');
    expect(region.hidden).toBe(true);
    expect(region.querySelector('a').textContent).toBe('Yardım');
  });
});
