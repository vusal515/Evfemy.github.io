/**
 * Header search over categories (src/data/navigation.json) and products
 * (src/data/products.json). Matching is case-insensitive and tolerant of
 * Azerbaijani/Turkish letters, so "caydanliq" finds "Çaydanlıq".
 */

import { foldText, slugify } from './text.js';
import { routes } from './routes.js';

export function normalize(text) {
  return foldText(text).replace(/\s+/g, ' ').trim();
}

/**
 * Flattens navigation (and optionally products) into searchable entries with
 * a breadcrumb path. Products come first so an exact product name wins ties.
 */
export function buildIndex(navigation, products = []) {
  const entries = products.map((p) => ({ label: p.name, path: ['Məhsul'], href: routes.product(p.id) }));
  for (const category of navigation) {
    const c = slugify(category.label);
    entries.push({ label: category.label, path: [], href: routes.category(c) });
    for (const column of category.columns) {
      entries.push({ label: column.title, path: [category.label], href: routes.category(c, slugify(column.title)) });
      for (const link of column.links) {
        entries.push({
          label: link.label,
          path: [category.label, column.title],
          href: routes.category(c, slugify(link.label)),
        });
      }
    }
  }
  // Column titles often repeat their first link ("Yemək Dəstləri" > "Yemək Dəstləri").
  const seen = new Set();
  return entries
    .map((entry) => ({ ...entry, key: normalize(entry.label) }))
    .filter((entry) => {
      const id = `${entry.key}|${entry.path.join('/')}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

/**
 * Ranks entries: exact match, then prefix, then word-prefix, then substring.
 * Shorter labels win ties so broad categories come before narrow ones.
 */
export function search(index, query, limit = 8) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored = [];
  for (const entry of index) {
    let score;
    if (entry.key === q) score = 0;
    else if (entry.key.startsWith(q)) score = 1;
    else if (entry.key.split(' ').some((word) => word.startsWith(q))) score = 2;
    else if (entry.key.includes(q)) score = 3;
    else continue;
    scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.entry.label.length - b.entry.label.length)
    .slice(0, limit)
    .map(({ entry }) => ({ label: entry.label, path: entry.path, href: entry.href }));
}
