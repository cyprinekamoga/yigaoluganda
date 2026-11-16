// "For schools": sends the form to the school-request function, which limits requests per visitor
// and checks the Cloudflare Turnstile bot test when the page has one.
// The page's texts and addresses come from <script id="page-data" type="application/json">.
(() => {
  const { strings: S, url: URL_, turnstile } = JSON.parse(document.getElementById('page-data').textContent);
  const form = document.getElementById('school-form');
  const out = document.getElementById('school-result');
  const button = form.querySelector('button');
  const show = (kind, text) => {
    out.className = 'verify-result ' + kind;
    out.textContent = text;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const v = (k) => String(f.get(k) || '').trim();
    if (!v('name') || !v('school') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) return show('bad', S.invalid);
    // Turnstile puts its answer in a hidden field of the form.
    const captcha = v('cf-turnstile-response');
    if (turnstile && !captcha) return show('bad', S.captcha);
    const students = parseInt(v('students'), 10);
    button.disabled = true;
    button.textContent = S.sending;
    try {
      const res = await fetch(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v('name'), school: v('school'), email: v('email'), students: students > 0 ? students : null, message: v('message'), lang: S.lang, captcha }),
      });
      if (res.status === 429) return show('bad', S.tooMany);
      const body = await res.json().catch(() => ({}));
      if (body.error === 'captcha') return show('bad', S.captcha);
      if (body.error === 'invalid') return show('bad', S.invalid);
      if (!res.ok || !body.ok) throw new Error(String(res.status));
      form.hidden = true;
      show('ok', S.sent);
    } catch {
      show('bad', S.error);
    } finally {
      button.disabled = false;
      button.textContent = S.send;
      // A Turnstile answer works once.
      if (turnstile && window.turnstile) window.turnstile.reset();
    }
  });
})();
