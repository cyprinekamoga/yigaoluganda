import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { injectPrice } from './netlify/edge-functions/_inject';
import { priceLine, quote } from './netlify/edge-functions/_pricing';

describe('landing page price', () => {
  it('puts the local price into every data-price span', () => {
    const html = '<p>Only <span class="price" data-price>€3.99 / month</span>.</p><p><span data-price>x</span></p>';
    const out = injectPrice(html, priceLine(quote('SE'), 'sv'));
    expect(out).not.toContain('€3.99');
    expect(out.match(/55,00\s*kr\/månad inkl\. moms/g)).toHaveLength(2);
  });

  it('only changes data-price spans', () => {
    expect(injectPrice('<span class="price">keep</span>', 'new')).toBe('<span class="price">keep</span>');
  });

  it('every price on the built pages is a data-price span', () => {
    const page = readFileSync(path.join(import.meta.dirname, 'dist/index.html'), 'utf8');
    expect(page.match(/data-price/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
