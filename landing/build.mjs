// Builds the landing page (yigaoluganda.com) into dist/: English at /, Swedish at /sv/,
// plus the terms and privacy pages, robots.txt, sitemap.xml and a 404 page.
// No dependencies: `node build.mjs`.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_URL, COMPANY, SITE_URL } from './src/company.mjs';
import { CONTENT } from './src/content.mjs';
import { privacy, terms } from './src/legal.mjs';
import { priceLine, quote } from './src/pricing.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
const course = JSON.parse(readFileSync(path.join(ROOT, 'src/course.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// Empty company fields show as visible placeholders, and the build warns about them.
const missing = Object.entries(COMPANY).filter(([, v]) => !v).map(([k]) => k);
const company = Object.fromEntries(Object.entries(COMPANY).map(([k, v]) => [k, v || `[${k}]`]));
/** Company details in one language (the address can differ between English and Swedish). */
const companyIn = (lang) => ({ ...company, address: typeof company.address === 'object' ? company.address[lang] : company.address });

/** The visitor's price. The edge function replaces the text inside every data-price span. */
const priceSpan = (lang) => `<span class="price" data-price>${esc(priceLine(quote(''), lang))}</span>`;
const factById = Object.fromEntries(course.facts.map((f) => [f.id, f.text]));

const signUp = (lang) => `${APP_URL}/sign-up?lang=${lang}`;
const signIn = (lang) => `${APP_URL}/sign-in?lang=${lang}`;

function head(t, { title, description, pathname, alternates }) {
  const url = SITE_URL + pathname;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${alternates ? `<link rel="alternate" hreflang="en" href="${SITE_URL}/">
<link rel="alternate" hreflang="sv" href="${SITE_URL}/sv/">
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">` : ''}
<meta name="theme-color" content="#250104">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/icon-180.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Yiga Oluganda">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/assets/og.png">
<meta property="og:locale" content="${t.locale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/style.css">
</head>`;
}

function header(t) {
  return `<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="${t.path}" aria-label="Yiga Oluganda">
      <img src="/assets/img/ngaali.svg" alt="" width="30" height="40">
      <span>Yiga Oluganda</span>
    </a>
    <nav class="nav" aria-label="${t.lang === 'sv' ? 'Huvudmeny' : 'Main'}">
      <a href="#how">${esc(t.nav.how)}</a>
      <a href="#course">${esc(t.nav.course)}</a>
      <a href="#price">${esc(t.nav.price)}</a>
      <a href="#faq">${esc(t.nav.faq)}</a>
    </nav>
    <div class="top-actions">
      <a class="lang" href="${t.other.path}" hreflang="${t.other.lang}" lang="${t.other.lang}">${esc(t.other.label)}</a>
      <a class="btn btn-ghost btn-small" href="${signIn(t.lang)}">${esc(t.nav.login)}</a>
    </div>
  </div>
</header>`;
}

function footer(t) {
  return `<footer class="foot">
  <div class="wrap foot-row">
    <div class="foot-brand">
      <img src="/assets/img/ngaali.svg" alt="" width="36" height="48">
      <div>
        <strong>Yiga Oluganda</strong>
        <p>${esc(t.footer.tagline)}</p>
      </div>
    </div>
    <nav class="foot-links" aria-label="${t.lang === 'sv' ? 'Sidfot' : 'Footer'}">
      <a href="${t.legal.terms}">${esc(t.footer.terms)}</a>
      <a href="${t.legal.privacy}">${esc(t.footer.privacy)}</a>
      <a href="mailto:${esc(company.email)}">${esc(t.footer.contact)}</a>
      <a href="${t.other.path}" hreflang="${t.other.lang}" lang="${t.other.lang}">${esc(t.other.label)}</a>
    </nav>
  </div>
  <div class="wrap foot-small">© ${new Date().getFullYear()} ${esc(company.name)} · ${esc(t.footer.orgNo)} ${esc(company.orgNo)} · ${esc(companyIn(t.lang).address)} · <a href="mailto:${esc(company.email)}">${esc(company.email)}</a></div>
</footer>`;
}

function phone(src, alt, { eager = false } = {}) {
  return `<div class="phone"><img src="/assets/screens/${src}.webp" alt="${esc(alt)}" width="390" height="844"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}></div>`;
}

const icon = (key) =>
  key === 'game'
    ? `<div class="icon icon-game"><img src="/assets/img/pot.svg" alt="" width="26" height="26"><img src="/assets/img/drum.svg" alt="" width="26" height="26"><img src="/assets/img/cowrie.svg" alt="" width="26" height="26"></div>`
    : `<img class="icon" src="/assets/img/scene-${key}.svg" alt="" width="64" height="64" loading="lazy">`;

function home(t) {
  const price = priceSpan(t.lang);
  const counts = course.counts;
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items
      .filter(([, a]) => !a.includes('{price}'))
      .map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return `${head(t, { title: t.meta.title, description: t.meta.description, pathname: t.path, alternates: true })}
<body>
${header(t)}
<main id="main">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="eyebrow">${esc(t.hero.eyebrow)}</p>
        <h1>${esc(t.hero.title)}</h1>
        <p class="lead">${esc(t.hero.lead)}</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${signUp(t.lang)}">${esc(t.hero.cta)}</a>
          <a class="btn btn-ghost" href="${signIn(t.lang)}">${esc(t.hero.login)}</a>
        </div>
        <p class="hero-price">${fill(esc(t.hero.price), { price })}</p>
      </div>
      <div class="hero-art">
        ${phone('intro', t.hero.shot, { eager: true })}
        <img class="hero-crane" src="/assets/img/ngaali.svg" alt="" width="150" height="200">
      </div>
    </div>
  </section>

  <section class="band" aria-labelledby="for-title">
    <div class="wrap">
      <h2 id="for-title" class="section-title">${esc(t.audience.title)}</h2>
      <div class="cards three">
        ${t.audience.items.map(([h, p]) => `<article class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="how" class="band" aria-labelledby="how-title">
    <div class="wrap">
      <h2 id="how-title" class="section-title">${esc(t.how.title)}</h2>
      <p class="section-lead">${esc(t.how.lead)}</p>
      <ol class="steps">
        ${t.how.steps
          .map(
            ([shot, h, p], i) => `<li class="step">
          ${phone(shot, h)}
          <div class="step-text"><span class="bead" aria-hidden="true">${i + 1}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>
        </li>`,
          )
          .join('\n        ')}
      </ol>
    </div>
  </section>

  <section class="band" aria-labelledby="diff-title">
    <div class="wrap">
      <h2 id="diff-title" class="section-title">${esc(t.different.title)}</h2>
      <div class="cards three">
        ${t.different.items.map(([k, h, p]) => `<article class="card card-icon">${icon(k)}<h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="course" class="band" aria-labelledby="course-title">
    <div class="wrap">
      <h2 id="course-title" class="section-title">${esc(t.course.title)}</h2>
      <p class="section-lead">${esc(fill(t.course.lead, counts))}</p>
      ${course.parts
        .map(
          (part) => `<h3 class="part-title">${esc(fill(t.course.part, { n: part.n, title: part.title[t.lang] }))}</h3>
      <ol class="chapters">
        ${part.chapters
          .map(
            (c) => `<li class="chapter">
          <img src="/assets/img/scene-${c.id}.svg" alt="" width="120" height="120" loading="lazy">
          <div><p class="chapter-n">${esc(fill(t.course.chapter, { n: c.n }))} · <span lang="lg">${esc(c.lg)}</span></p><h3>${esc(c.title[t.lang])}</h3><p>${esc(c.scenario[t.lang])}</p></div>
        </li>`,
          )
          .join('\n        ')}
      </ol>`,
        )
        .join('\n      ')}
      <p class="note">${esc(t.course.next)}</p>
    </div>
  </section>

  <section class="band" aria-labelledby="facts-title">
    <div class="wrap">
      <h2 id="facts-title" class="section-title">${esc(t.facts.title)}</h2>
      <div class="cards three">
        ${t.facts.ids.map((id) => `<article class="card fact"><p>${esc(factById[id][t.lang])}</p></article>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section id="price" class="band" aria-labelledby="price-title">
    <div class="wrap">
      <div class="price-card">
        <h2 id="price-title">${esc(t.price.title)}</h2>
        <p class="price-big">${fill(esc(t.price.per), { price })}</p>
        <ul class="ticks">
          ${t.price.items.map((x) => `<li>${esc(x)}</li>`).join('\n          ')}
        </ul>
        <a class="btn btn-primary btn-wide" href="${signUp(t.lang)}">${esc(t.price.cta)}</a>
        <p class="web-note">${esc(t.price.web)}</p>
        <p class="small">${esc(t.price.small)}</p>
      </div>
    </div>
  </section>

  <section class="band" aria-labelledby="story-title">
    <div class="wrap narrow">
      <h2 id="story-title" class="section-title">${esc(t.story.title)}</h2>
      ${t.story.body.map((p) => `<p class="story">${p}</p>`).join('\n      ')}
    </div>
  </section>

  <section id="faq" class="band" aria-labelledby="faq-title">
    <div class="wrap narrow">
      <h2 id="faq-title" class="section-title">${esc(t.faq.title)}</h2>
      ${t.faq.items.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${fill(esc(a), { price })}</p></details>`).join('\n      ')}
    </div>
  </section>

  <section class="band final">
    <div class="wrap final-row">
      <img src="/assets/img/ngaali.svg" alt="" width="120" height="160" loading="lazy">
      <div>
        <h2>${esc(t.final.title)}</h2>
        <a class="btn btn-primary" href="${signUp(t.lang)}">${esc(t.final.cta)}</a>
      </div>
    </div>
  </section>
</main>
${footer(t)}
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</body>
</html>
`;
}

function legalPage(t, doc, pathname) {
  return `${head(t, { title: `${doc.title} – Yiga Oluganda`, description: doc.title, pathname, alternates: false })}
<body>
${header(t)}
<main id="main" class="legal wrap narrow">
  <p><a href="${t.path}">${esc(t.legal.back)}</a></p>
  <h1>${esc(doc.title)}</h1>
  <p class="small">${esc(t.legal.updated)}: ${doc.updated}</p>
  ${doc.sections.map(([h, body]) => `<h2>${esc(h)}</h2>\n  ${body.startsWith('<') ? body : `<p>${body}</p>`}`).join('\n  ')}
</main>
${footer(t)}
</body>
</html>
`;
}

function notFound() {
  const t = CONTENT.en;
  return `${head(t, { title: 'Not found – Yiga Oluganda', description: 'Page not found', pathname: '/404', alternates: false })}
<body>
<main id="main" class="wrap narrow notfound">
  <img src="/assets/img/ngaali.svg" alt="" width="120" height="160">
  <h1>Page not found</h1>
  <p><a class="btn btn-primary" href="/">Yiga Oluganda</a> <a class="btn btn-ghost" href="/sv/">På svenska</a></p>
</main>
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, html);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

const pages = [];
for (const t of Object.values(CONTENT)) {
  write(`${t.path.slice(1)}index.html`, home(t));
  write(`${t.legal.terms.slice(1)}index.html`, legalPage(t, terms(t.lang, companyIn(t.lang)), t.legal.terms));
  write(`${t.legal.privacy.slice(1)}index.html`, legalPage(t, privacy(t.lang, companyIn(t.lang)), t.legal.privacy));
  pages.push(t.path, t.legal.terms, t.legal.privacy);
}
write('404.html', notFound());
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}\n</urlset>\n`,
);

console.log(`built ${pages.length + 1} pages into dist/`);
if (missing.length) console.warn(`⚠ company details still empty in src/company.mjs: ${missing.join(', ')}`);
