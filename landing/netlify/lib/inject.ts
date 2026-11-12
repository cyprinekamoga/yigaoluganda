// Puts the visitor's price into every <span data-price> on a page. No imports, so it can be
// unit-tested in Node as well as run by Netlify's edge runtime.
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function injectPrice(html: string, line: string): string {
  return html.replace(/(<span\b[^>]*\bdata-price\b[^>]*>)[^<]*(<\/span>)/g, (_m, open: string, close: string) => open + escapeHtml(line) + close);
}
