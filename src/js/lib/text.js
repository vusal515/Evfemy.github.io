/**
 * Text helpers shared by the browser code and the build-time templates.
 * Folding Azerbaijani/Turkish letters to ASCII lets "caydanliq" match
 * "Çaydanlıq" and keeps generated ids ASCII-only.
 */

const FOLD = { ç: 'c', ə: 'e', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

export function foldText(text) {
  return String(text)
    .toLocaleLowerCase('az')
    .replace(/[çəğıöşü]/g, (ch) => FOLD[ch])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
}

export function slugify(text) {
  return foldText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
