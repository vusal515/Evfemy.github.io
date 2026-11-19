// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const STYLES = path.resolve(import.meta.dirname, '..', 'src', 'styles');
const css = fs
  .readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(STYLES, f), 'utf8'))
  .join('\n');

describe('stylesheets', () => {
  it('define every custom property they use', () => {
    const used = new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
    const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    // Set per element at render time by src/render/templates/home.js
    const runtime = new Set(['--media-height', '--media-fit']);
    expect([...used].filter((v) => !defined.has(v) && !runtime.has(v))).toEqual([]);
  });

  it('do not load remote fonts or styles with @import', () => {
    expect(css).not.toMatch(/@import\s+url\(/);
  });
});
