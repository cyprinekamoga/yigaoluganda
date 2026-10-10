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

  const show = (state) => $$('[data-state]').forEach((el) => (el.hidden = el.dataset.state !== state))
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  // ---------- sign up (step 1) ----------
  if (page === 'signup') {
    const form = $('[data-form=signup]')
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const err = $('[data-error]', form)
      showMsg(err, '')
      const email = form.email.value.trim().toLowerCase()
      const a = form.pw1.value
      const b = form.pw2.value
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showMsg(err, tr('Skriv en giltig e-postadress.', 'Enter a valid email address.'))
      if (a.length < 8) return showMsg(err, tr('Lösenordet behöver minst 8 tecken.', 'The password needs at least 8 characters.'))
      if (a !== b) return showMsg(err, tr('Lösenorden är inte likadana.', "The passwords don't match."))
      if (!form.consent.checked) return showMsg(err, tr('Kryssa i att du godkänner villkoren för att fortsätta.', 'Please tick the box to accept the terms.'))
      const button = $('button[type=submit]', form)
      button.disabled = true
      const r = await api('signup', { email, password: a })
      button.disabled = false
      if (r.ok) return window.location.assign('/pay.html')
      if (r.data.error === 'exists')
        return showMsg(err, tr('Det finns redan ett konto med den e-postadressen. Logga in i stället.', 'There is already an account with that email. Please log in instead.'))
      showMsg(err, genericError())
    })
  }

  // ---------- payment (step 2) ----------
  if (page === 'pay') {
    const err = $('[data-error]')
    ;(async () => {
      const r = await api('me')
      if (r.status === 401) return window.location.assign('/login.html?next=/pay.html')
      if (r.ok && r.data.active) return window.location.assign('/app/')
      if (!r.ok) {
        show('pay')
        return showMsg(err, genericError())
      }
      $$('[data-username]').forEach((el) => (el.textContent = r.data.username))
      show('pay')
    })()
    $('[data-pay]').addEventListener('click', async (e) => {
      const button = e.currentTarget
      showMsg(err, '')
      button.disabled = true
      const r = await api('checkout')
      if (r.ok && typeof r.data.url === 'string' && r.data.url.startsWith('https://checkout.stripe.com/')) return window.location.assign(r.data.url)
      button.disabled = false
      if (r.data.error === 'already_active') return window.location.assign('/app/')
      if (r.status === 401) return window.location.assign('/login.html?next=/pay.html')
      showMsg(
        err,
        r.data.error === 'not_configured'
          ? tr('Betalningen är inte öppnad än. Försök igen snart!', "Payments aren't open yet. Please try again soon!")
          : genericError(),
      )
    })
    $('[data-logout]').addEventListener('click', async (e) => {
      e.preventDefault()
      await api('logout')
      window.location.assign('/login.html?bye=1')
    })
  }

  // ---------- back from Stripe: unlock and open the app ----------
  if (page === 'welcome') {
    const params = new URLSearchParams(location.search)
    const sessionId = params.get('session_id') || ''
    if (sessionId) history.replaceState(null, '', location.pathname)
    const confirm = async () => {
      show('loading')
      if (!sessionId) return window.location.assign('/pay.html')
      // Stripe can take a few seconds to finish; try for up to ~20 seconds.
      for (let i = 0; i < 8; i++) {
        const r = await api('confirm', { sessionId })
        if (r.ok && r.data.active) return window.location.assign('/app/')
        if (r.status === 401) return window.location.assign('/login.html?next=/app/')
        if (r.status !== 402 && !(r.ok && !r.data.active)) break
        await wait(2500)
      }
      $('[data-error-text]').textContent = tr(
        'Vi väntar fortfarande på bekräftelsen från betalningen. Vänta en liten stund och försök igen.',
        "We're still waiting for the payment confirmation. Wait a moment and try again.",
      )
      show('error')
    }
    $('[data-retry]')?.addEventListener('click', confirm)
    confirm()
  }

  // ---------- forgot password ----------
  if (page === 'forgot') {
    const form = $('[data-form=forgot]')
    try {
      const prefill = sessionStorage.getItem('yiga-forgot-email')
      if (prefill) form.email.value = prefill
    } catch {
      /* private mode */
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const err = $('[data-error]', form)
      showMsg(err, '')
      const email = form.email.value.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showMsg(err, tr('Skriv en giltig e-postadress.', 'Enter a valid email address.'))
      const button = $('button[type=submit]', form)
      button.disabled = true
      const r = await api('forgot', { email })
      button.disabled = false
      if (r.ok) {
        form.hidden = true
        $('[data-sent]').hidden = false
        return
      }
      showMsg(
        err,
        r.data.error === 'not_configured'
          ? tr('Det går inte att skicka mejl just nu. Mejla info@zaweddeoils.com så hjälper vi dig.', "We can't send emails right now. Email info@zaweddeoils.com and we'll help.")
          : genericError(),
      )
    })
  }

  // ---------- new password from the emailed link ----------
  if (page === 'reset') {
    const form = $('[data-form=reset]')
    const resetToken = new URLSearchParams(location.hash.slice(1)).get('token') || ''
    if (location.hash) history.replaceState(null, '', location.pathname)
    const err = $('[data-error]', form)
    if (!resetToken) showMsg(err, tr('Länken är ogiltig. Be om en ny länk.', 'This link is not valid. Ask for a new link.'))
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      showMsg(err, '')
      const a = form.pw1.value
      const b = form.pw2.value
      if (a.length < 8) return showMsg(err, tr('Lösenordet behöver minst 8 tecken.', 'The password needs at least 8 characters.'))
      if (a !== b) return showMsg(err, tr('Lösenorden är inte likadana.', "The passwords don't match."))
      const button = $('button[type=submit]', form)
      button.disabled = true
      const r = await api('reset', { resetToken, newPassword: a })
      button.disabled = false
      if (r.ok) return window.location.assign(r.data.active ? '/app/' : '/pay.html')
      showMsg(
        err,
        r.data.error === 'bad_link'
          ? tr('Länken har gått ut eller redan använts. Be om en ny länk.', 'The link has expired or was already used. Ask for a new link.')
          : genericError(),
      )
    })
  }

  // ---------- login ----------
  if (page === 'login') {
    const params = new URLSearchParams(location.search)
    const loginForm = $('[data-form=login]')
    const changeForm = $('[data-form=change]')
    const next = (() => {
      const n = params.get('next') || '/app/'
      return /^\/(app(\/[\w\-./]*)?|pay\.html)$/.test(n) ? n : '/app/'
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
      if (!username || !password) return showMsg(err, tr('Fyll i e-postadress och lösenord.', 'Enter your email address and password.'))
      const button = $('button[type=submit]', loginForm)
      button.disabled = true
      const r = await api('login', { username, password })
      button.disabled = false
      if (r.ok) {
        if (r.data.mustChange) return showChange(username)
        return window.location.assign(r.data.active ? next : '/pay.html')
      }
      const messages = {
        wrong_login: tr('Fel e-postadress eller lösenord.', 'Wrong email address or password.'),
        locked: tr('För många försök. Vänta 15 minuter och försök igen.', 'Too many tries. Wait 15 minutes and try again.'),
      }
      showMsg(err, messages[r.data.error] || genericError())
      if (r.data.error === 'wrong_login' || r.data.error === 'locked') {
        // Offer the way out right where the problem is.
        const link = document.createElement('a')
        link.href = '/forgot.html'
        // Hand the email over without putting it in the address.
        try {
          sessionStorage.setItem('yiga-forgot-email', username)
        } catch {
          /* private mode */
        }
        link.textContent = tr('Glömt lösenordet?', 'Forgot your password?')
        link.style.marginLeft = '6px'
        err.append(link)
      }
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
})()
