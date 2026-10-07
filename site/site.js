// Yiga Oluganda website: language switch, buying, showing the first login, logging in.
;(() => {
  const html = document.documentElement
  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

  // ---------- language ----------
  const LANG_KEY = 'yiga-site-lang'
  const stored = (() => {
    try {
      return localStorage.getItem(LANG_KEY)
    } catch {
      return null
    }
  })()
  const guess = (navigator.language || 'sv').toLowerCase().startsWith('sv') ? 'sv' : 'en'
  const setLang = (lang) => {
    html.dataset.lang = lang
    html.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* private mode */
    }
  }
  setLang(stored === 'sv' || stored === 'en' ? stored : guess)
  $$('[data-lang-toggle]').forEach((b) => b.addEventListener('click', () => setLang(html.dataset.lang === 'sv' ? 'en' : 'sv')))
  const tr = (sv, en) => (html.dataset.lang === 'en' ? en : sv)
  $$('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())))

  // ---------- talking to /api ----------
  async function api(action, body = {}) {
    try {
      const res = await fetch(`/api/${action}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, data }
    } catch {
      return { ok: false, status: 0, data: { error: 'offline' } }
    }
  }
  const showMsg = (el, text) => {
    if (!el) return
    el.textContent = text
    el.hidden = !text
  }
  const genericError = () => tr('Något gick fel. Kontrollera internetanslutningen och försök igen.', 'Something went wrong. Check your internet connection and try again.')

  const page = document.body.dataset.page

  // ---------- landing: buy ----------
  if (page === 'landing') {
    $$('[data-buy]').forEach((button) =>
      button.addEventListener('click', async () => {
        const errorEl = button.parentElement.querySelector('[data-buy-error]') || $('[data-buy-error]')
        showMsg(errorEl, '')
        $$('[data-buy]').forEach((b) => (b.disabled = true))
        const r = await api('checkout')
        if (r.ok && typeof r.data.url === 'string' && r.data.url.startsWith('https://checkout.stripe.com/')) {
          window.location.assign(r.data.url)
          return
        }
        $$('[data-buy]').forEach((b) => (b.disabled = false))
        showMsg(
          errorEl,
          r.data.error === 'not_configured'
            ? tr('Köpet är inte öppnat än. Försök igen snart!', "Purchases aren't open yet. Please try again soon!")
            : genericError(),
        )
      }),
    )
  }

  // ---------- thank-you page: show the new login once ----------
  if (page === 'thanks') {
    const params = new URLSearchParams(location.search)
    const sessionId = params.get('session_id') || sessionStorageGet('yiga-cs') || ''
    // Keep the id out of the address bar and history, but remember it for "try again" in this tab.
    if (params.has('session_id')) {
      sessionStorageSet('yiga-cs', sessionId)
      history.replaceState(null, '', location.pathname)
    }
    const show = (state) => $$('[data-state]').forEach((el) => (el.hidden = el.dataset.state !== state))
    const fill = (username, password) => {
      $$('[data-username]').forEach((el) => (el.textContent = username))
      $$('[data-password]').forEach((el) => (el.textContent = password || ''))
      $$('[data-login-link]').forEach((a) => (a.href = `/login.html?u=${encodeURIComponent(username)}`))
    }
    const claim = async () => {
      show('loading')
      if (!sessionId) {
        $('[data-error-text]').textContent = tr('Vi hittade inget köp på den här sidan.', "We couldn't find a purchase on this page.")
        return show('error')
      }
      const r = await api('claim', { sessionId })
      if (r.ok && r.data.password) {
        fill(r.data.username, r.data.password)
        sessionStorageSet('yiga-cs', '')
        return show('new')
      }
      if (r.ok && r.data.alreadyShown) {
        fill(r.data.username)
        return show('shown')
      }
      const messages = {
        not_paid: tr('Betalningen är inte klar än. Vänta en liten stund och försök igen.', "The payment isn't finished yet. Wait a moment and try again."),
        expired: tr('Länken är för gammal. Mejla oss så hjälper vi dig.', 'This link is too old. Email us and we will help.'),
      }
      $('[data-error-text]').textContent = messages[r.data.error] || genericError()
      show('error')
    }
    $('[data-retry]')?.addEventListener('click', claim)
    $$('[data-copy]').forEach((b) =>
      b.addEventListener('click', async () => {
        const text = $(`[data-${b.dataset.copy}]`)?.textContent || ''
        try {
          await navigator.clipboard.writeText(text)
          const old = b.innerHTML
          b.textContent = tr('Kopierat ✓', 'Copied ✓')
          setTimeout(() => (b.innerHTML = old), 1500)
        } catch {
          /* clipboard blocked: the text is on screen */
        }
      }),
    )
    claim()
  }

  // ---------- login ----------
  if (page === 'login') {
    const params = new URLSearchParams(location.search)
    const loginForm = $('[data-form=login]')
    const changeForm = $('[data-form=change]')
    const next = (() => {
      const n = params.get('next') || '/app/'
      return /^\/app(\/[\w\-./]*)?$/.test(n) ? n : '/app/'
    })()
    if (params.get('u')) loginForm.username.value = params.get('u')
    if (params.get('bye')) $('[data-bye]').hidden = false
    const showChange = (username) => {
      loginForm.hidden = true
      changeForm.hidden = false
      changeForm.username.value = username || ''
      changeForm.new1.focus()
    }
    if (params.get('change')) showChange('')

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const err = $('[data-error]', loginForm)
      showMsg(err, '')
      const username = loginForm.username.value.trim().toLowerCase()
      const password = loginForm.password.value
      if (!username || !password) return showMsg(err, tr('Fyll i användarnamn och lösenord.', 'Enter your username and password.'))
      const button = $('button[type=submit]', loginForm)
      button.disabled = true
      const r = await api('login', { username, password })
      button.disabled = false
      if (r.ok) {
        if (r.data.mustChange) return showChange(username)
        return window.location.assign(next)
      }
      const messages = {
        wrong_login: tr('Fel användarnamn eller lösenord.', 'Wrong username or password.'),
        locked: tr('För många försök. Vänta 15 minuter och försök igen.', 'Too many tries. Wait 15 minutes and try again.'),
        inactive: tr('Prenumerationen är inte aktiv. Starta den igen på startsidan.', "The subscription isn't active. Start it again on the home page."),
      }
      showMsg(err, messages[r.data.error] || genericError())
    })

    changeForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const err = $('[data-error]', changeForm)
      showMsg(err, '')
      const a = changeForm.new1.value
      const b = changeForm.new2.value
      if (a.length < 8) return showMsg(err, tr('Lösenordet behöver minst 8 tecken.', 'The password needs at least 8 characters.'))
      if (a !== b) return showMsg(err, tr('Lösenorden är inte likadana.', "The passwords don't match."))
      const button = $('button[type=submit]', changeForm)
      button.disabled = true
      const r = await api('change-password', { newPassword: a })
      button.disabled = false
      if (r.ok) return window.location.assign(next)
      if (r.status === 401) {
        changeForm.hidden = true
        loginForm.hidden = false
        return showMsg($('[data-error]', loginForm), tr('Logga in igen först.', 'Please log in again first.'))
      }
      showMsg(err, genericError())
    })
  }

  function sessionStorageGet(k) {
    try {
      return sessionStorage.getItem(k)
    } catch {
      return null
    }
  }
  function sessionStorageSet(k, v) {
    try {
      if (v) sessionStorage.setItem(k, v)
      else sessionStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
})()
