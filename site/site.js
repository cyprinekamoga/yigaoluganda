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
      for (let i = 0; i < 12; i++) {
        const r = await api('confirm', { sessionId })
        if (r.ok && r.data.active) return window.location.assign('/app/')
        if (r.status === 401) return window.location.assign('/login.html?next=/app/')
        // 402: Stripe hasn't finished yet; ok-but-not-active: the webhook is on its way. Both settle in seconds.
        if (r.status !== 402 && !(r.ok && !r.data.active)) break
        await wait(i < 4 ? 1000 : 2500)
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
      return /^\/(app(\/[\w\-./]*)?|pay\.html|salj\.html)$/.test(n) ? n : '/app/'
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
      if (!username || !password) return showMsg(err, tr('Fyll i e-post eller användarnamn och lösenord.', 'Enter your email or username and your password.'))
      const button = $('button[type=submit]', loginForm)
      button.disabled = true
      const r = await api('login', { username, password })
      button.disabled = false
      if (r.ok) {
        if (r.data.mustChange) return showChange(username)
        if (r.data.seller) return window.location.assign('/salj.html')
        return window.location.assign(r.data.active ? next : '/pay.html')
      }
      const messages = {
        wrong_login: tr('Fel användarnamn/e-post eller lösenord.', 'Wrong username/email or password.'),
        locked: tr('För många försök. Vänta 15 minuter och försök igen.', 'Too many tries. Wait 15 minutes and try again.'),
      }
      showMsg(err, messages[r.data.error] || genericError())
      if ((r.data.error === 'wrong_login' || r.data.error === 'locked') && username.includes('@')) {
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

  // ---------- seller page (fair / mässa): make logins and send them ----------
  if (page === 'seller') {
    const form = $('[data-form=create]')
    const result = $('[data-result]')
    const list = $('[data-list]')
    const msgBox = $('[data-r=message]')
    const sendTo = $('[data-r=sendto]')
    let current = null // { username, password, paidUntil, active, subscribed, name, siteUrl }
    let siteUrl = location.origin

    const fmtDate = (iso, lang) =>
      new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })

    const message = (a, lang) => {
      const login = `${siteUrl}/login.html?u=${encodeURIComponent(a.username)}`
      const home = `${siteUrl}/hemskarm.html`
      const first = (a.name || '').trim().split(/\s+/)[0]
      const paid = a.paidUntil && new Date(a.paidUntil) > new Date()
      if (lang === 'en') {
        return [
          `Hi${first ? ' ' + first : ''}! Welcome to Yiga Oluganda 🪶`,
          '',
          `Log in here: ${login}`,
          `Username: ${a.username}`,
          `Password: ${a.password}`,
          '',
          paid
            ? `You have access until ${fmtDate(a.paidUntil, 'en')}. After that you can keep going for 39 kr/month by card on the website.`
            : 'When you log in you go straight to payment (39 kr/month, cancel any time). The app opens right after.',
          '',
          `Put the app on your home screen: ${home}`,
          '',
          'Webale nnyo!',
        ].join('\n')
      }
      return [
        `Hej${first ? ' ' + first : ''}! Välkommen till Yiga Oluganda 🪶`,
        '',
        `Logga in här: ${login}`,
        `Användarnamn: ${a.username}`,
        `Lösenord: ${a.password}`,
        '',
        paid
          ? `Du har tillgång till och med ${fmtDate(a.paidUntil, 'sv')}. Sedan kan du fortsätta för 39 kr/mån med kort på sidan.`
          : 'När du loggar in kommer du direkt till betalningen (39 kr/mån, avsluta när du vill). Sedan öppnas appen.',
        '',
        `Lägg appen på hemskärmen: ${home}`,
        '',
        'Webale nnyo!',
      ].join('\n')
    }

    // Swedish mobile numbers: 070… → 4670…; +46… / 0046… → 46…
    const intlDigits = (raw) => {
      let d = (raw || '').replace(/[^\d+]/g, '')
      if (d.startsWith('+')) d = d.slice(1)
      else if (d.startsWith('00')) d = d.slice(2)
      else if (d.startsWith('0')) d = '46' + d.slice(1)
      return d.replace(/\D/g, '')
    }
    const updateLinks = () => {
      const text = msgBox.value
      const digits = intlDigits(sendTo.value)
      // "?&body=" works on both iPhone and Android.
      $('[data-send=sms]').href = `sms:${digits ? '+' + digits : ''}?&body=${encodeURIComponent(text)}`
      $('[data-send=whatsapp]').href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    }
    const msgLang = () => ($('input[name=msglang]:checked') || {}).value || 'sv'
    const showResult = (a) => {
      current = a
      $('[data-r=username]').textContent = a.username
      $('[data-r=password]').textContent = a.password
      $('[data-r=status]').textContent = a.subscribed
        ? tr('Prenumererar med kort.', 'Subscribes by card.')
        : a.paidUntil && new Date(a.paidUntil) > new Date()
          ? tr(`Betald till och med ${fmtDate(a.paidUntil, 'sv')}.`, `Paid until ${fmtDate(a.paidUntil, 'en')}.`)
          : tr('Betalar med kort när de loggar in.', 'Pays by card when they log in.')
      sendTo.value = a.phone || ''
      msgBox.value = message(a, msgLang())
      updateLinks()
      $('[data-copied]').hidden = true
      result.hidden = false
      result.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    $$('input[name=msglang]').forEach((r) =>
      r.addEventListener('change', () => {
        if (!current) return
        msgBox.value = message(current, msgLang())
        updateLinks()
      }),
    )
    msgBox.addEventListener('input', updateLinks)
    sendTo.addEventListener('input', updateLinks)
    $('[data-send=sms]').addEventListener('click', updateLinks)
    $('[data-send=whatsapp]').addEventListener('click', updateLinks)
    $('[data-copy]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(msgBox.value)
      } catch {
        msgBox.select()
        document.execCommand('copy')
      }
      $('[data-copied]').hidden = false
    })
    $('[data-next]').addEventListener('click', () => {
      current = null
      result.hidden = true
      form.reset()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      form.cname.focus()
    })

    const statusChip = (a) => {
      const chip = document.createElement('span')
      chip.className = 'chip'
      if (a.subscribed) {
        chip.classList.add('ok')
        chip.textContent = tr('Kort, aktiv', 'Card, active')
      } else if (a.active) {
        chip.classList.add('ok')
        chip.textContent = tr(`Betald t.o.m. ${fmtDate(a.paidUntil, 'sv')}`, `Paid until ${fmtDate(a.paidUntil, 'en')}`)
      } else if (a.paidUntil) {
        chip.classList.add('off')
        chip.textContent = tr('Månaden slut', 'Month ended')
      } else {
        chip.classList.add('wait')
        chip.textContent = tr('Väntar på kortbetalning', 'Waiting for card payment')
      }
      return chip
    }
    const button = (label, cls, onClick) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = `btn small ${cls}`
      b.textContent = label
      b.addEventListener('click', onClick)
      return b
    }
    const render = (accounts) => {
      list.replaceChildren()
      $('[data-empty]').hidden = accounts.length > 0
      $('[data-count]').textContent = accounts.length ? String(accounts.length) : ''
      for (const a of accounts) {
        const li = document.createElement('li')
        const who = document.createElement('div')
        who.className = 'who'
        const name = document.createElement('strong')
        name.textContent = a.name || tr('(inget namn)', '(no name)')
        who.append(name, statusChip(a))
        const meta = document.createElement('div')
        meta.className = 'meta'
        const code = document.createElement('code')
        code.textContent = a.username
        meta.append(code, document.createTextNode(`${a.phone ? ' · ' + a.phone : ''} · ${fmtDate(a.createdAt, html.dataset.lang)}`))
        const acts = document.createElement('div')
        acts.className = 'acts'
        if (!a.subscribed)
          acts.append(
            button(tr('+1 månad (betalt)', '+1 month (paid)'), 'go', async (e) => {
              if (!window.confirm(tr(`Har ${a.name || a.username} betalat en månad till (Swish/kontant)?`, `Has ${a.name || a.username} paid for another month (Swish/cash)?`))) return
              e.currentTarget.disabled = true
              const r = await api('seller-extend', { id: a.id })
              if (!r.ok) window.alert(genericError())
              load()
            }),
          )
        acts.append(
          button(tr('Nytt lösenord', 'New password'), 'ghost', async (e) => {
            if (!window.confirm(tr(`Göra ett nytt lösenord för ${a.username}? Det gamla slutar fungera.`, `Make a new password for ${a.username}? The old one stops working.`))) return
            e.currentTarget.disabled = true
            const r = await api('seller-password', { id: a.id })
            if (!r.ok) return window.alert(genericError())
            showResult(r.data)
            load()
          }),
        )
        li.append(who, meta, acts)
        list.append(li)
      }
    }
    async function load() {
      const r = await api('seller-list')
      if (r.status === 401) return window.location.assign('/login.html?next=/salj.html')
      if (r.status === 403) return show('denied')
      show('ready')
      if (!r.ok) return showMsg($('[data-error]', form), genericError())
      if (r.data.siteUrl) siteUrl = r.data.siteUrl
      render(r.data.accounts || [])
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const err = $('[data-error]', form)
      showMsg(err, '')
      const submit = $('button[type=submit]', form)
      submit.disabled = true
      const r = await api('seller-create', {
        name: form.cname.value.trim(),
        phone: form.phone.value.trim(),
        paid: form.paid.value === 'yes',
      })
      submit.disabled = false
      if (r.status === 401) return window.location.assign('/login.html?next=/salj.html')
      if (!r.ok) return showMsg(err, genericError())
      if (r.data.siteUrl) siteUrl = r.data.siteUrl
      showResult(r.data)
      load()
    })
    $$('[data-logout]').forEach((el) =>
      el.addEventListener('click', async (e) => {
        e.preventDefault()
        await api('logout')
        window.location.assign('/login.html?bye=1')
      }),
    )
    load()
  }

  // ---------- "put the app on your home screen" ----------
  if (page === 'install') {
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/.test(ua)
    const pick = (tab) => {
      $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)))
      $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab))
    }
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.tab)))
    pick(isAndroid && !isIOS ? 'android' : 'ios')
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('[data-installed]').hidden = false
    // Chrome on Android can install with one tap.
    let promptEvent = null
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      promptEvent = e
      $('[data-install]').hidden = false
    })
    $('[data-install]').addEventListener('click', async () => {
      if (!promptEvent) return
      promptEvent.prompt()
      await promptEvent.userChoice.catch(() => null)
      promptEvent = null
      $('[data-install]').hidden = true
    })
    window.addEventListener('appinstalled', () => ($('[data-installed]').hidden = false))
  }
})()
