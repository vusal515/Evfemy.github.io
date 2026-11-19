import { describe, expect, it } from 'vitest';
import navigation from '../src/data/navigation.json';
import { buildIndex, normalize, search } from '../src/js/lib/search.js';

describe('normalize', () => {
  it('folds Azerbaijani letters and case', () => {
    expect(normalize('  ÇAYDANLIQ  Şüşə ')).toBe('caydanliq suse');
    expect(normalize('Ərzaq Ğ Ö Ü İ')).toBe('erzaq g o u i');
  });
});

describe('search', () => {
  const index = buildIndex(navigation);

  it('finds categories without typing special letters', () => {
    const labels = search(index, 'caydan').map((r) => r.label);
    expect(labels).toContain('Çaydan');
  });

  it('ranks exact and prefix matches before substring matches', () => {
    const results = search(index, 'qazan');
    expect(normalize(results[0].label).startsWith('qazan')).toBe(true);
  });

  it('returns breadcrumbs for nested entries', () => {
    const [first] = search(index, 'Düdüklü Qazan');
    expect(first.path.length).toBeGreaterThan(0);
  });

  it('ignores queries shorter than two characters and respects the limit', () => {
    expect(search(index, 'a')).toEqual([]);
    expect(search(index, 'qa', 3)).toHaveLength(3);
  });

  it('removes duplicate entries at the same path', () => {
    const keys = index.map((e) => `${e.key}|${e.path.join('/')}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
