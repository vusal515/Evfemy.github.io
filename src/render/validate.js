import fs from 'node:fs';
import path from 'node:path';
import { VARIANT_CLASS } from './templates/home.js';
import { slugify } from '../js/lib/text.js';

/**
 * Validates content files before they are rendered, so a typo in JSON fails
 * the build with a precise message instead of shipping a broken page.
 */
export class ContentError extends Error {
  constructor(file, problems) {
    super(`${file} is invalid:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ContentError';
    this.problems = problems;
  }
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const PRODUCT_VARIANTS = new Set(['products', 'products-compact']);

/**
 * Checks that an internal link points at something that exists:
 * category.html?c=..&sub=.. must name a known category (and sub-category),
 * product.html?id=.. a known product. External and "#" links are not checked.
 */
export function checkInternalHref(href, catalog) {
  if (!catalog || !/^(category|product)\.html/.test(href)) return null;
  const url = new URL(href, 'https://example.test/');
  if (url.pathname === '/product.html') {
    const id = url.searchParams.get('id');
    return catalog.getProduct(id) ? null : `links to unknown product "${id}"`;
  }
  if (url.searchParams.has('q')) return null;
  const category = catalog.getCategory(url.searchParams.get('c'));
  if (!category) return `links to unknown category "${url.searchParams.get('c')}"`;
  const sub = url.searchParams.get('sub');
  if (sub && !catalog.findSubLabel(category, sub))
    return `links to unknown sub-category "${sub}" in "${category.slug}"`;
  return null;
}

function checkLink(link, where, problems, { requireHref = true } = {}) {
  if (!isNonEmptyString(link?.label)) problems.push(`${where}: "label" must be a non-empty string`);
  if (requireHref && !isNonEmptyString(link?.href)) problems.push(`${where}: "href" must be a non-empty string`);
}

export function validateHome(content, { publicDir, catalog } = {}) {
  const problems = [];
  if (!Array.isArray(content?.sections)) {
    throw new ContentError('home.json', ['"sections" must be an array']);
  }
  const ids = new Set();
  content.sections.forEach((section, s) => {
    const where = `sections[${s}] (${section.id ?? 'no id'})`;
    if (!isNonEmptyString(section.id)) problems.push(`${where}: "id" is required`);
    else if (ids.has(section.id)) problems.push(`${where}: duplicate id`);
    ids.add(section.id);
    if (!(section.variant in VARIANT_CLASS)) problems.push(`${where}: unknown variant "${section.variant}"`);
    if (!isNonEmptyString(section.heading)) problems.push(`${where}: "heading" is required for accessibility`);
    if (section.layout) {
      const { height, fit } = section.layout;
      if (!Number.isInteger(height) || height <= 0) problems.push(`${where}: layout.height must be a positive integer`);
      if (!['cover', 'contain'].includes(fit)) problems.push(`${where}: layout.fit must be "cover" or "contain"`);
    }
    if (!Array.isArray(section.items) || section.items.length === 0) {
      problems.push(`${where}: "items" must be a non-empty array`);
      return;
    }
    section.items.forEach((item, i) => {
      const at = `${where}.items[${i}]`;
      if (PRODUCT_VARIANTS.has(section.variant)) {
        if (!isNonEmptyString(item.product)) problems.push(`${at}: "product" (a product id) is required`);
        else if (catalog && !catalog.getProduct(item.product))
          problems.push(`${at}: unknown product "${item.product}"`);
        return;
      }
      if (!isNonEmptyString(item.href)) problems.push(`${at}: "href" is required`);
      else {
        const linkProblem = checkInternalHref(item.href, catalog);
        if (linkProblem) problems.push(`${at}: ${linkProblem}`);
      }
      if (!item.image && !isNonEmptyString(item.label)) problems.push(`${at}: needs an "image" or a "label"`);
      if (item.image) {
        if (typeof item.alt !== 'string') problems.push(`${at}: "alt" is required when "image" is set`);
        if (!item.label && !isNonEmptyString(item.alt))
          problems.push(`${at}: image-only items need descriptive "alt" text`);
        if (publicDir && !fs.existsSync(path.join(publicDir, 'images', item.image))) {
          problems.push(`${at}: image "${item.image}" not found in public/images`);
        }
      }
    });
  });
  if (problems.length) throw new ContentError('home.json', problems);
  return content;
}

export function validateNavigation(items, file = 'navigation.json') {
  const problems = [];
  if (!Array.isArray(items)) throw new ContentError(file, ['root must be an array']);
  items.forEach((item, i) => {
    checkLink(item, `[${i}]`, problems, { requireHref: false });
    if (!Array.isArray(item.columns)) problems.push(`[${i}]: "columns" must be an array`);
    item.columns?.forEach((col, c) => {
      if (!isNonEmptyString(col.title)) problems.push(`[${i}].columns[${c}]: "title" is required`);
      col.links?.forEach((link, l) =>
        checkLink(link, `[${i}].columns[${c}].links[${l}]`, problems, { requireHref: false }),
      );
    });
  });
  if (problems.length) throw new ContentError(file, problems);
  return items;
}

export function validateFooter(groups, { file = 'footer.json', catalog } = {}) {
  const problems = [];
  if (!Array.isArray(groups)) throw new ContentError(file, ['root must be an array']);
  groups.forEach((group, g) => {
    if (!isNonEmptyString(group.title)) problems.push(`[${g}]: "title" is required`);
    if (!Array.isArray(group.links) || !group.links.length) problems.push(`[${g}]: "links" must be a non-empty array`);
    group.links?.forEach((link, l) => {
      checkLink(link, `[${g}].links[${l}]`, problems);
      const linkProblem = link?.href && checkInternalHref(link.href, catalog);
      if (linkProblem) problems.push(`[${g}].links[${l}]: ${linkProblem}`);
    });
  });
  if (problems.length) throw new ContentError(file, problems);
  return groups;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Products must fit the navigation: the category, column ("group") and link
 * ("subcategory") have to exist, so every product is reachable from the menu.
 * Tags may only name highlighted menu entries (Endirim, Yenilər ...), and the
 * "endirim" tag must match an actual old price.
 */
export function validateProducts(products, { navigation, publicDir, file = 'products.json' } = {}) {
  const problems = [];
  if (!Array.isArray(products)) throw new ContentError(file, ['root must be an array']);
  const categories = new Map((navigation ?? []).map((item) => [slugify(item.label), item]));
  const tagSlugs = new Set((navigation ?? []).filter((item) => item.highlight).map((item) => slugify(item.label)));
  const ids = new Set();

  products.forEach((p, i) => {
    const where = `[${i}] (${p?.id ?? 'no id'})`;
    if (!ID_PATTERN.test(p?.id ?? '')) problems.push(`${where}: "id" must be a lowercase slug`);
    else if (ids.has(p.id)) problems.push(`${where}: duplicate id`);
    ids.add(p?.id);
    for (const field of ['name', 'alt', 'description', 'image', 'group', 'subcategory']) {
      if (!isNonEmptyString(p?.[field])) problems.push(`${where}: "${field}" is required`);
    }
    if (!(typeof p.price === 'number' && p.price > 0)) problems.push(`${where}: "price" must be a positive number`);
    if (p.oldPrice !== undefined && !(typeof p.oldPrice === 'number' && p.oldPrice > p.price)) {
      problems.push(`${where}: "oldPrice" must be higher than "price"`);
    }
    if (!Number.isInteger(p.stock) || p.stock < 0) problems.push(`${where}: "stock" must be a whole number >= 0`);
    if (!Array.isArray(p.tags)) problems.push(`${where}: "tags" must be an array`);
    else {
      p.tags.filter((t) => !tagSlugs.has(t)).forEach((t) => problems.push(`${where}: unknown tag "${t}"`));
      if (p.tags.includes('endirim') !== (p.oldPrice !== undefined)) {
        problems.push(`${where}: the "endirim" tag and "oldPrice" must be used together`);
      }
    }
    if (navigation) {
      const category = categories.get(p.category);
      const group = category?.columns.find((col) => col.title === p.group);
      if (!category || category.highlight) problems.push(`${where}: unknown category "${p.category}"`);
      else if (!group) problems.push(`${where}: "${p.group}" is not a column of "${category.label}"`);
      else if (!group.links.some((link) => link.label === p.subcategory)) {
        problems.push(`${where}: "${p.subcategory}" is not a link under "${p.group}"`);
      }
    }
    if (publicDir && p.image && !fs.existsSync(path.join(publicDir, 'images', p.image))) {
      problems.push(`${where}: image "${p.image}" not found in public/images`);
    }
  });
  if (problems.length) throw new ContentError(file, problems);
  return products;
}
