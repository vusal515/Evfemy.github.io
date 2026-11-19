import fs from 'node:fs';
import path from 'node:path';
import { VARIANT_CLASS } from './templates/home.js';

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

function checkLink(link, where, problems) {
  if (!isNonEmptyString(link?.label)) problems.push(`${where}: "label" must be a non-empty string`);
  if (!isNonEmptyString(link?.href)) problems.push(`${where}: "href" must be a non-empty string`);
}

export function validateHome(content, { publicDir } = {}) {
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
      if (!isNonEmptyString(item.href)) problems.push(`${at}: "href" is required`);
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
    checkLink(item, `[${i}]`, problems);
    if (!Array.isArray(item.columns)) problems.push(`[${i}]: "columns" must be an array`);
    item.columns?.forEach((col, c) => {
      if (!isNonEmptyString(col.title)) problems.push(`[${i}].columns[${c}]: "title" is required`);
      col.links?.forEach((link, l) => checkLink(link, `[${i}].columns[${c}].links[${l}]`, problems));
    });
  });
  if (problems.length) throw new ContentError(file, problems);
  return items;
}

export function validateFooter(groups, file = 'footer.json') {
  const problems = [];
  if (!Array.isArray(groups)) throw new ContentError(file, ['root must be an array']);
  groups.forEach((group, g) => {
    if (!isNonEmptyString(group.title)) problems.push(`[${g}]: "title" is required`);
    if (!Array.isArray(group.links) || !group.links.length) problems.push(`[${g}]: "links" must be a non-empty array`);
    group.links?.forEach((link, l) => checkLink(link, `[${g}].links[${l}]`, problems));
  });
  if (problems.length) throw new ContentError(file, problems);
  return groups;
}
