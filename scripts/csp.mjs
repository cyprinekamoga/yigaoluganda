// Test helper: serves the app with the Content-Security-Policy from netlify.toml (as Netlify does in
// production) and collects anything the policy blocks, so a test fails when the policy would break
// a feature.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function cspFromNetlify(root, supabaseHost) {
  const toml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  const m = toml.match(/Content-Security-Policy = "([^"]+)"/);
  if (!m) throw new Error('No Content-Security-Policy in netlify.toml');
  return supabaseHost ? m[1].replaceAll('qbagcpemtsqaoykwqger.supabase.co', supabaseHost) : m[1];
}

/** Every new page of `browser` (and of `context`, if given) gets the policy; returns the violations seen. */
export function enforceCsp(browser, base, policy, context) {
  const violations = [];
  const watch = (page) =>
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to (load|execute|connect|frame|apply)/i.test(m.text())) violations.push(m.text().slice(0, 300));
    });
  const route = (target) =>
    target.route(`${base}/**`, async (r) => {
      const res = await r.fetch();
      const headers = { ...res.headers() };
      if ((headers['content-type'] ?? '').includes('text/html')) headers['content-security-policy'] = policy;
      await r.fulfill({ response: res, headers });
    });
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (options) => {
    const page = await newPage(options);
    await route(page);
    watch(page);
    return page;
  };
  if (context) {
    route(context);
    context.on('page', watch);
  }
  return violations;
}
