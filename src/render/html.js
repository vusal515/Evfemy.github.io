/**
 * Minimal, dependency-free HTML templating with automatic escaping.
 *
 * Every interpolated value is escaped unless it was produced by `html` itself
 * or explicitly wrapped with `raw()`. Arrays are joined, and null, undefined
 * and false render as an empty string, which keeps conditional markup short.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Marks a trusted string as already-safe HTML. Never pass user input here. */
export function raw(value) {
  return new SafeHtml(String(value));
}

function serialize(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(serialize).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += serialize(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}
