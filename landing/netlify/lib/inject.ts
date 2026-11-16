// Puts the visitor's price into every <span data-price> on a page; a span with data-plan="yearly"
// (or family_monthly, family_yearly) gets that plan's price. No imports, so it can be unit-tested in
// Node as well as run by Netlify's edge runtime.
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function injectPrice(html: string, line: string | ((plan: string) => string)): string {
  const lineFor = typeof line === 'string' ? () => line : line;
  return html.replace(/(<span\b[^>]*\bdata-price\b[^>]*>)[^<]*(<\/span>)/g, (_m, open: string, close: string) => {
    const plan = /\bdata-plan="([a-z_]+)"/.exec(open)?.[1] ?? 'monthly';
    return open + escapeHtml(lineFor(plan)) + close;
  });
}
