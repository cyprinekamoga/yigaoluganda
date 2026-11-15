// Renders the Instagram starter pack (docs/social/*.png) with Ngaali, in the app's colours.
// Feed posts are 1080 × 1350 (4:5). Uses the pre-installed Playwright Chromium and the Inter font.
// Run: node scripts/make-social.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'social');
mkdirSync(OUT, { recursive: true });

const P = { maroon: '#250104', card: '#3A0A0D', deep: '#4D1116', line: '#5E1C22', ink: '#FFF1EC', ink2: '#E3BEB7', ink3: '#A8807A', tomato: '#D71A06', tomatoText: '#FF7A66', neon: '#CDF73D' };

// ---- Ngaali (same drawing as src/ui/Ngaali.tsx), plus a side-eye face for the cheeky posts ----
const COL = { body: '#A7B1BE', bodyShade: '#8E99A8', wing: '#6F7B8B', wingPanel: '#FFF1EC', gold: '#CDF73D', goldTip: '#9CC21A', cap: '#1F1A17', cheek: '#FFF1EC', red: '#D71A06', beak: '#3D4049', leg: '#8E99A8', eye: '#1F1A17' };
const WING = { stand: [0, 0], wave: [0, 104], cheer: [125, 125], bow: [-15, -15], point: [0, 82], think: [0, 150] };
const wing = (a) => `<g transform="rotate(${a} 42 92)"><path d="M43 88 C24 90 17 108 24 126 C34 121 42 111 48 99 Z" fill="${COL.wing}"/><path d="M39 95 C29 99 25 108 27 116 C34 111 39 104 43 98 Z" fill="${COL.wingPanel}"/><path d="M27 116 C25 120 24 124 24 126 C28 123 31 119 33 115 Z" fill="${COL.gold}"/></g>`;
function eyes(face) {
  if (face === 'happy') return `<path d="M45.5 55 Q50 49 54.5 55 M65.5 55 Q70 49 74.5 55" stroke="${COL.eye}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
  if (face === 'side') {
    // Half-closed lids, pupils to the side: Ngaali has noticed.
    return `<circle cx="52.6" cy="55.4" r="3.6" fill="${COL.eye}"/><circle cx="72.6" cy="55.4" r="3.6" fill="${COL.eye}"/><path d="M44.5 52 H55.5 M64.5 52 H75.5" stroke="${COL.eye}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const d = face === 'up' ? [1.2, -2.4] : [0, 0];
  const brows = face === 'soft' ? `<path d="M45 47.5 L53.5 46 M75 47.5 L66.5 46" stroke="${COL.eye}" stroke-width="1.9" stroke-linecap="round"/>` : '';
  return `<circle cx="${50 + d[0]}" cy="${54 + d[1]}" r="4" fill="${COL.eye}"/><circle cx="${70 + d[0]}" cy="${54 + d[1]}" r="4" fill="${COL.eye}"/><circle cx="${51.4 + d[0]}" cy="${52.5 + d[1]}" r="1.4" fill="#fff"/><circle cx="${71.4 + d[0]}" cy="${52.5 + d[1]}" r="1.4" fill="#fff"/>${brows}`;
}
function head(face, speaking) {
  const bristles = [-64, -48, -32, -16, 0, 16, 32, 48, 64]
    .map((deg, i) => {
      const len = 15 + (i % 2) * 4.5;
      const rad = ((deg - 90) * Math.PI) / 180;
      const x = 60 + Math.cos(rad) * len;
      const y = 34 + Math.sin(rad) * len;
      return `<line x1="60" y1="34" x2="${x}" y2="${y}" stroke="${COL.gold}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.4" fill="${COL.goldTip}"/>`;
    })
    .join('');
  const beak = speaking
    ? `<path d="M56 59.5 L64 59.5 L60 65 Z" fill="${COL.beak}"/><path d="M57.2 66.4 L62.8 66.4 L60 70 Z" fill="${COL.beak}"/><path d="M57 65 L63 65 L62.6 66.5 L57.4 66.5 Z" fill="#C2414C"/>`
    : `<path d="M56 59.5 L64 59.5 L60 69 Z" fill="${COL.beak}"/>`;
  return `${bristles}<circle cx="60" cy="51" r="20.5" fill="${COL.body}"/><path d="M40.6 48 A20 20 0 0 1 79.4 48 Q60 40 40.6 48 Z" fill="${COL.cap}"/><ellipse cx="49" cy="55" rx="9" ry="10" fill="${COL.cheek}"/><ellipse cx="71" cy="55" rx="9" ry="10" fill="${COL.cheek}"/><ellipse cx="49" cy="46.2" rx="5.6" ry="2.5" fill="${COL.red}"/><ellipse cx="71" cy="46.2" rx="5.6" ry="2.5" fill="${COL.red}"/>${eyes(face)}<ellipse cx="44.5" cy="62" rx="3" ry="1.6" fill="#F6A9B3" opacity="0.85"/><ellipse cx="75.5" cy="62" rx="3" ry="1.6" fill="#F6A9B3" opacity="0.85"/>${beak}<ellipse cx="60" cy="73.5" rx="3.1" ry="4.6" fill="${COL.red}"/>`;
}
function ngaali({ pose = 'stand', face = 'open', speaking = false, size = 420 } = {}) {
  const [l, r] = WING[pose];
  const tilt = pose === 'think' ? 'rotate(7 60 70)' : pose === 'point' ? 'rotate(-4 60 70)' : '';
  return `<svg width="${size}" height="${(size * 160) / 120}" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg"><ellipse cx="58" cy="155" rx="22" ry="3.5" fill="rgba(0,0,0,0.3)"/><g stroke="${COL.leg}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M58 120 L58 151 M52 152 L64 152"/><path d="M66 119 L79 130 L69 139 L63 138"/></g><path d="M50.5 52 C49.5 72 47 85 45 95 L75 95 C73 85 70.5 72 69.5 52 Z" fill="${COL.body}"/><ellipse cx="60" cy="104" rx="27" ry="22.5" fill="${COL.body}"/><path d="M52 80 C55 91 65 91 68 80 C66 97 54 97 52 80 Z" fill="${COL.bodyShade}" opacity="0.6"/>${wing(l)}<g transform="translate(120 0) scale(-1 1)">${wing(r)}</g><g transform="${tilt}">${head(face, speaking)}</g></svg>`;
}
const drum = (size, off = false) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M3.8 6.4 L6.2 19 Q12 22.2 17.8 19 L20.2 6.4 Q12 9.4 3.8 6.4 Z" fill="${off ? P.line : P.tomato}"/><path d="M5.6 7.6 L8.4 19.8 L11.2 8.6 L14 19.9 L16.6 8.3 L18.4 7.6" stroke="${off ? P.line : P.neon}" stroke-width="1.1" fill="none" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="12" cy="6.2" rx="8.2" ry="2.6" fill="${off ? P.ink3 : P.ink}"/></svg>`;

// ---- Layout pieces ----
const CSS = `
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;background:${P.maroon};color:${P.ink};font-family:'Inter','Inter Display',sans-serif;overflow:hidden;position:relative}
.pad{position:absolute;inset:72px 76px 0 76px}
.kicker{font:800 30px 'Inter Display';letter-spacing:.16em;text-transform:uppercase;color:${P.neon}}
.h{font:800 82px/1.04 'Inter Display';letter-spacing:-.02em;margin-top:26px}
.h.small{font-size:66px}
.sub{font:500 40px/1.3 'Inter';color:${P.ink2};margin-top:22px}
.phrase{background:${P.card};border:3px solid ${P.line};border-radius:40px;padding:34px 40px}
.lg{font:800 72px/1.08 'Inter Display';color:${P.neon}}
.tr{font:500 40px/1.3 'Inter';color:${P.ink};margin-top:10px}
.note{font:500 32px/1.35 'Inter';color:${P.ink2};margin-top:14px}
.foot{position:absolute;left:76px;right:76px;bottom:56px;display:flex;justify-content:space-between;align-items:center;font:700 30px 'Inter';color:${P.ink2}}
.foot b{color:${P.ink}}
.pill{display:inline-block;background:${P.tomato};color:${P.ink};font:800 30px 'Inter Display';letter-spacing:.06em;padding:12px 26px;border-radius:999px;text-transform:uppercase}
.dots{display:flex;gap:12px}.dots i{width:16px;height:16px;border-radius:8px;background:${P.line};display:block}.dots i.on{background:${P.neon}}
`;
const foot = (right = '<b>yigaoluganda.com</b>') => `<div class="foot"><span>Yiga Oluganda</span>${right}</div>`;
const dots = (n, on) => `<div class="dots">${Array.from({ length: n }, (_, i) => `<i class="${i === on ? 'on' : ''}"></i>`).join('')}</div>`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;

// ---- The posts ----
const posts = [
  {
    file: '00-meet-ngaali.png',
    html: page(`<div class="pad">
      <div class="kicker">Meet Ngaali</div>
      <div class="h">Uganda’s crested crane.<br>Stands on one leg.<br>Teaches Luganda.<br><span style="color:${P.tomatoText}">Judges a little.</span></div>
      <div style="position:absolute;right:-20px;bottom:92px">${ngaali({ pose: 'wave', face: 'happy', speaking: true, size: 470 })}</div>
      <div class="phrase" style="position:absolute;left:0;bottom:150px;width:470px"><div class="lg" style="font-size:60px">Oli otya?</div><div class="tr" style="font-size:34px">How are you?</div><div class="note">Follow for a new Luganda phrase every week.</div></div>
    </div>${foot()}`),
  },
  {
    file: '01-pov-jjajja.png',
    html: page(`<div class="pad">
      <div class="kicker">POV</div>
      <div class="h">Jjajja asks<br>“Oli otya?”<br>and you reply<br><span style="color:${P.tomatoText}">“I’m fine.”</span></div>
      <div style="position:absolute;right:-30px;bottom:92px">${ngaali({ pose: 'point', face: 'side', size: 470 })}</div>
      <div class="phrase" style="position:absolute;left:0;bottom:150px;width:560px"><div class="lg">Ndi bulungi.</div><div class="tr">I’m fine.</div><div class="note">Ngaali saw that.</div></div>
    </div>${foot()}`),
  },
  {
    file: '02a-gyebale-ko.png',
    html: page(`<div class="pad">
      <div class="kicker">Word of the week</div>
      <div class="lg" style="font-size:150px;margin-top:40px;line-height:1">Gyebale<br>ko</div>
      <div class="sub" style="font-size:46px;color:${P.ink}">well done · thanks for your work</div>
      <div style="position:absolute;right:-10px;bottom:92px">${ngaali({ pose: 'wave', face: 'happy', speaking: true, size: 430 })}</div>
      <div class="sub" style="position:absolute;left:0;bottom:150px;width:460px">Swipe to see when to say it →</div>
    </div>${foot(dots(3, 0))}`),
  },
  {
    file: '02b-gyebale-ko.png',
    html: page(`<div class="pad">
      <div class="kicker">When do I say it?</div>
      <div class="h small">To anyone who is busy working.</div>
      <div class="sub">At the market, in the kitchen, in the garden. It thanks them for their work.</div>
      <div class="phrase" style="margin-top:56px"><div class="note" style="margin:0 0 6px">You:</div><div class="lg">Gyebale ko!</div><div class="note" style="margin-top:26px">They answer:</div><div class="lg" style="color:${P.ink}">Kale.</div><div class="tr" style="color:${P.ink2}">okay</div></div>
      <div style="position:absolute;right:20px;bottom:92px">${ngaali({ pose: 'cheer', face: 'happy', speaking: true, size: 270 })}</div>
    </div>${foot(dots(3, 1))}`),
  },
  {
    file: '02c-gyebale-ko.png',
    html: page(`<div class="pad" style="text-align:center">
      <div class="kicker">Yiga Oluganda</div>
      <div class="h" style="margin-top:36px">Learn 160 everyday<br>Luganda phrases<br>with Ngaali.</div>
      <div style="display:flex;justify-content:center;margin-top:30px">${ngaali({ pose: 'cheer', face: 'happy', speaking: true, size: 380 })}</div>
      <div class="sub" style="margin-top:10px">5 minutes a day · English or Swedish</div>
      <div style="margin-top:34px"><span class="pill">Start at yigaoluganda.com</span></div>
    </div>${foot(dots(3, 2))}`),
  },
  {
    file: '03-one-leg.png',
    html: page(`<div class="pad">
      <div class="kicker">A gentle reminder</div>
      <div class="h">Ngaali has been standing on one leg since 6 am.</div>
      <div class="sub">Waiting for your lesson. No pressure.</div>
      <div style="position:absolute;left:250px;bottom:92px">${ngaali({ pose: 'stand', face: 'side', size: 470 })}</div>
      <div class="phrase" style="position:absolute;right:0;top:700px;width:330px;padding:26px 30px"><div class="lg" style="font-size:48px">Wasuze otya?</div><div class="note">Good morning</div></div>
    </div>${foot()}`),
  },
  {
    file: '04-yogera-mpola.png',
    html: page(`<div class="pad">
      <div class="kicker">Every family gathering</div>
      <div class="h small">Me when the aunties switch to Luganda at full speed:</div>
      <div class="lg" style="font-size:118px;margin-top:40px;line-height:1">Yogera<br>mpola!</div>
      <div class="sub" style="color:${P.ink}">= speak slowly</div>
      <div style="position:absolute;right:-20px;bottom:92px">${ngaali({ pose: 'think', face: 'up', size: 450 })}</div>
    </div>${foot()}`),
  },
  {
    file: '05-food.png',
    html: page(`<div class="pad">
      <div class="kicker">At every Ugandan table</div>
      <div class="h small">Two phrases that get you a second plate.</div>
      <div class="phrase" style="margin-top:44px;width:640px"><div class="lg" style="font-size:62px">Emmere ewooma.</div><div class="tr">The food is delicious.</div></div>
      <div class="phrase" style="margin-top:24px;width:640px"><div class="lg" style="font-size:62px">Weebale okufumba.</div><div class="tr">Thanks for cooking.</div></div>
      <div style="position:absolute;right:-40px;bottom:92px">${ngaali({ pose: 'cheer', face: 'happy', speaking: true, size: 400 })}</div>
    </div>${foot()}`),
  },
  {
    file: '06-market.png',
    html: page(`<div class="pad">
      <div class="kicker">At the market</div>
      <div class="h">The two most useful words:</div>
      <div class="lg" style="font-size:132px;margin-top:40px;line-height:1">Ssente<br>mmeka?</div>
      <div class="sub" style="color:${P.ink}">How much is it?</div>
      <div class="note" style="margin-top:22px;width:480px">Say it, then smile. Part 2 of the course has a whole chapter at the market.</div>
      <div style="position:absolute;right:-30px;bottom:92px">${ngaali({ pose: 'point', face: 'open', size: 440 })}</div>
    </div>${foot()}`),
  },
  {
    file: '07-drum.png',
    html: page(`<div class="pad">
      <div class="kicker">Your drumbeat</div>
      <div class="h">Your drum went quiet.<br><span style="color:${P.tomatoText}">Ngaali noticed.</span></div>
      <div style="display:flex;gap:18px;margin-top:56px">${[1, 1, 1, 1, 0, 0, 0].map((on) => drum(118, !on)).join('')}</div>
      <div class="sub">One lesson a day keeps the drum beating.</div>
      <div style="position:absolute;right:-10px;bottom:92px">${ngaali({ pose: 'stand', face: 'soft', size: 400 })}</div>
    </div>${foot()}`),
  },
  {
    file: '08-sunday-call.png',
    html: page(`<div class="pad">
      <div class="kicker">This Sunday</div>
      <div class="h">Learn it this week.<br>Say it on the call.</div>
      <div class="phrase" style="margin-top:54px;width:660px"><div class="lg" style="font-size:80px">Jjajja,<br>oli otya?</div><div class="tr">Grandma / Grandpa, how are you?</div></div>
      <div style="position:absolute;right:-30px;bottom:92px">${ngaali({ pose: 'wave', face: 'happy', speaking: true, size: 420 })}</div>
    </div>${foot()}`),
  },
  // Swedish versions for the Swedish audience
  {
    file: 'sv-02a-gyebale-ko.png',
    html: page(`<div class="pad">
      <div class="kicker">Veckans ord</div>
      <div class="lg" style="font-size:150px;margin-top:40px;line-height:1">Gyebale<br>ko</div>
      <div class="sub" style="font-size:46px;color:${P.ink}">bra jobbat · tack för ditt arbete</div>
      <div style="position:absolute;right:-10px;bottom:92px">${ngaali({ pose: 'wave', face: 'happy', speaking: true, size: 430 })}</div>
      <div class="sub" style="position:absolute;left:0;bottom:150px;width:460px">Svep för att se när du säger det →</div>
    </div>${foot(dots(3, 0))}`),
  },
  {
    file: 'sv-02b-gyebale-ko.png',
    html: page(`<div class="pad">
      <div class="kicker">När säger man det?</div>
      <div class="h small">Till någon som jobbar.</div>
      <div class="sub">På marknaden, i köket, i trädgården. Det tackar för arbetet.</div>
      <div class="phrase" style="margin-top:56px"><div class="note" style="margin:0 0 6px">Du:</div><div class="lg">Gyebale ko!</div><div class="note" style="margin-top:26px">De svarar:</div><div class="lg" style="color:${P.ink}">Kale.</div><div class="tr" style="color:${P.ink2}">okej</div></div>
      <div style="position:absolute;right:20px;bottom:92px">${ngaali({ pose: 'cheer', face: 'happy', speaking: true, size: 270 })}</div>
    </div>${foot(dots(3, 1))}`),
  },
  {
    file: 'sv-02c-gyebale-ko.png',
    html: page(`<div class="pad" style="text-align:center">
      <div class="kicker">Yiga Oluganda</div>
      <div class="h" style="margin-top:36px">Lär dig 160 vardagliga<br>fraser på luganda<br>med Ngaali.</div>
      <div style="display:flex;justify-content:center;margin-top:30px">${ngaali({ pose: 'cheer', face: 'happy', speaking: true, size: 380 })}</div>
      <div class="sub" style="margin-top:10px">5 minuter om dagen · på svenska</div>
      <div style="margin-top:34px"><span class="pill">Börja på yigaoluganda.com</span></div>
    </div>${foot(dots(3, 2))}`),
  },
  {
    file: 'sv-03-ett-ben.png',
    html: page(`<div class="pad">
      <div class="kicker">En vänlig påminnelse</div>
      <div class="h">Ngaali har stått på ett ben sedan klockan sex.</div>
      <div class="sub">Och väntar på din lektion. Ingen stress.</div>
      <div style="position:absolute;left:250px;bottom:92px">${ngaali({ pose: 'stand', face: 'side', size: 470 })}</div>
      <div class="phrase" style="position:absolute;right:0;top:700px;width:330px;padding:26px 30px"><div class="lg" style="font-size:48px">Wasuze otya?</div><div class="note">God morgon</div></div>
    </div>${foot()}`),
  },
];

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const p of posts) {
  await pg.setContent(p.html, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, p.file) });
  console.log(`  ${p.file}`);
}

// A preview of the profile grid (first nine English posts, newest first as Instagram shows them).
const grid = posts.filter((p) => !p.file.startsWith('sv-') && !/0[2][bc]/.test(p.file)).reverse();
const thumbs = grid.map((p) => `<img src="file://${path.join(OUT, p.file)}" style="width:356px;height:445px;object-fit:cover;display:block">`).join('');
await pg.setViewportSize({ width: 1080, height: 1350 });
await pg.goto(`file://${OUT}/`);
await pg.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,356px);gap:6px;width:1080px">${thumbs}</body>`);
await pg.waitForTimeout(300);
await pg.screenshot({ path: path.join(OUT, 'grid-preview.png'), fullPage: true });
console.log('  grid-preview.png');
await browser.close();
