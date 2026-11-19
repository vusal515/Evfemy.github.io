import { describe, expect, it } from 'vitest';
import { escapeHtml, html, raw } from '../src/render/html.js';

describe('html template tag', () => {
  it('escapes interpolated values', () => {
    const label = '<img src=x onerror="alert(1)">';
    expect(String(html`<p>${label}</p>`)).toBe('<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
  });

  it('does not double-escape nested templates', () => {
    const inner = html`<b>${'a & b'}</b>`;
    expect(String(html`<p>${inner}</p>`)).toBe('<p><b>a &amp; b</b></p>');
  });

  it('joins arrays and drops null, undefined and false', () => {
    expect(String(html`${['a', null, 'b', undefined, false]}`)).toBe('ab');
  });

  it('keeps raw() values as-is', () => {
    expect(String(html`${raw('<br>')}`)).toBe('<br>');
  });

  it('escapes quotes so values are safe inside attributes', () => {
    expect(escapeHtml(`" onmouseover='x'`)).toBe('&quot; onmouseover=&#39;x&#39;');
  });
});
