// Shows each visitor the monthly price in their own currency, including VAT where we collect it.
// Netlify knows the visitor's country from their IP address, the same signal Stripe Checkout
// uses to pick the currency, so the page and the checkout agree.
import type { Context } from 'https://edge.netlify.com';
import { injectPrice } from '../lib/inject.ts';
import { priceLine, quote } from '../lib/pricing.ts';

export default async (request: Request, context: Context) => {
  const response = await context.next();
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;
  const lang = new URL(request.url).pathname.startsWith('/sv') ? 'sv' : 'en';
  const html = injectPrice(await response.text(), priceLine(quote(context.geo?.country?.code), lang));
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  // The price depends on where the visitor is, so shared caches must not reuse the page.
  headers.set('cache-control', 'private, max-age=0, must-revalidate');
  return new Response(html, { status: response.status, headers });
};

export const config = { path: '/*', excludedPath: ['/assets/*', '/robots.txt', '/sitemap.xml'] };
