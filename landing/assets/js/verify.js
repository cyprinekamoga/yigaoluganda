// "Check a certificate": looks a code up with the database's public verify_certificate function.
// The page's texts and addresses come from <script id="page-data" type="application/json">.
(() => {
  const { strings: S, url: URL_, key: KEY } = JSON.parse(document.getElementById('page-data').textContent);
  const form = document.getElementById('verify-form');
  const input = document.getElementById('code');
  const out = document.getElementById('verify-result');
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  function normalize(raw) {
    const s = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
    const body = s.startsWith('YO') ? s.slice(2) : s;
    if (body.length !== 12) return null;
    const code = 'YO-' + body.slice(0, 4) + '-' + body.slice(4, 8) + '-' + body.slice(8);
    return /^YO-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code) ? code : null;
  }
  function show(kind, nodes) {
    out.className = 'verify-result ' + kind;
    out.replaceChildren(...nodes);
  }
  async function check(raw) {
    const code = normalize(raw);
    if (!code) return show('bad', [el('p', null, S.badCode)]);
    input.value = code;
    history.replaceState(null, '', '?c=' + encodeURIComponent(code));
    show('wait', [el('p', null, S.checking)]);
    try {
      const res = await fetch(URL_, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: code }) });
      if (!res.ok) throw new Error(String(res.status));
      const rows = await res.json();
      if (!rows.length) return show('bad', [el('p', null, S.invalid)]);
      const r = rows[0];
      const date = new Date(r.issued_at).toLocaleDateString(S.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
      show('ok', [
        el('p', 'verify-badge', '✓ ' + S.valid),
        el('p', 'verify-name', r.learner_name),
        el('p', null, fill(S.completed, { n: r.part, title: S.parts[r.part] || '' })),
        el('p', 'verify-meta', [r.phrases > 0 ? fill(S.phrases, { n: r.phrases }) : '', fill(S.issued, { date }), code].filter(Boolean).join(' · ')),
      ]);
    } catch {
      show('bad', [el('p', null, S.error)]);
    }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    check(input.value);
  });
  const start = new URLSearchParams(location.search).get('c');
  if (start) {
    input.value = start;
    check(start);
  }
})();
