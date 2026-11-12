// Small helpers shared by the Edge Functions.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

export const env = (name: string): string => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};

/** Where the app runs; Stripe sends people back here after paying. */
export const appUrl = () => Deno.env.get('APP_URL') ?? 'https://app.yigaoluganda.com';
/** The landing page, which holds the terms. */
export const siteUrl = () => Deno.env.get('SITE_URL') ?? 'https://yigaoluganda.com';
