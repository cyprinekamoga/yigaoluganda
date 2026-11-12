// GET /api/price → the monthly price for the visitor's country, for the app's paywall.
// Netlify knows the country from the visitor's IP address, the same signal Stripe Checkout
// uses to pick the currency.
import type { Context } from 'https://edge.netlify.com';
import { quote } from './_pricing.ts';

export default (_request: Request, context: Context) =>
  Response.json(quote(context.geo?.country?.code), {
    headers: { 'cache-control': 'private, no-store' },
  });

export const config = { path: '/api/price' };
