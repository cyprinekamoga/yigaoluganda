# Selling Yiga Oluganda: setup guide

This guide sets up the paid website: a landing page, sign-up with email and password, a Stripe subscription (39 SEK a month, renewing automatically), and an app that only opens for people with an active subscription.

## How it fits together

```
Landing page (/)  ──"Kom igång"──▶  Sign up (/signup.html): email + password
                                         │
                                         ▼
                              Payment (/pay.html) ──▶ Stripe Checkout (39 kr/mån)
                                                            │ paid
                                                            ▼
                              Welcome (/welcome.html) ── unlocks the account at once
                                         │
                                         ▼
App (/app/) ── served only with a valid login and an active subscription
Login (/login.html) ── on other devices; unpaid accounts are sent to /pay.html
```

| Part | Where it runs | Files |
|---|---|---|
| Landing, sign-up, payment, welcome and login pages | Netlify | `site/` |
| The app, under `/app/`, with login required | Netlify | `src/`, built by `npm run build:site` |
| `/api/*` (keeps the login in a secure cookie) and the `/app/*` gate | Netlify Edge Functions | `netlify/edge-functions/` |
| Accounts, passwords, sessions, Stripe checks | Supabase project `ilcwxstkuuyydnskobll` | `supabase/functions/`, `supabase/migrations/` |

**Already done:** the database tables and both Supabase functions (`yiga-api` and `yiga-stripe-webhook`) are deployed and the website is live on Netlify. Sign-up, login, sessions, "not paid yet" handling, cancellation and the lock after 5 wrong passwords have been tested against the live functions.

**Still to do (about 30 minutes):** steps 1–4 below. They need your own accounts, so only you can do them.

---

## 1. Stripe (start in test mode)

1. Create an account at [stripe.com](https://stripe.com). Keep the **Test mode** switch on for now.
2. **Product catalog → Add product**
   - Name: `Yiga Oluganda`
   - Pricing: **Recurring**, **39.00 SEK**, billing period **Monthly**
   - Save, then open the price and copy its **Price ID** (`price_…`).
3. **Developers → API keys:** copy the **Secret key** (`sk_test_…`). Never share it or put it in the website code.
4. **Settings → Billing → Customer portal:** turn on
   - Cancel subscriptions, set to **at the end of the billing period**
   - Update payment methods
   - Invoice history

   Then click Save. This is the page buyers reach from **Settings → Subscription and receipts** in the app.
5. **Developers → Webhooks → Add endpoint**
   - URL: `https://ilcwxstkuuyydnskobll.supabase.co/functions/v1/yiga-stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Save, then copy the **Signing secret** (`whsec_…`).

## 2. Netlify (hosting)

1. Get this code onto GitHub. It is on the branch `claude/duels-online-progress`, so merge it into `main` or deploy that branch.
2. At [netlify.com](https://netlify.com), click **Add new site → Import an existing project → GitHub** and pick `cyprinekamoga/yigaoluganda`.
3. You don't need to change any build settings: `netlify.toml` already sets them (`npm run build:site`, publish folder `site-dist`, Edge Functions).
4. Deploy, then note your site address, for example `https://yiga-oluganda.netlify.app`.
   - Optional: **Domain management → Add a domain**, for example `yiga.zaweddeoils.com`, and follow Netlify's DNS steps.

## 3. Supabase secrets

In the [Supabase dashboard](https://supabase.com/dashboard/project/ilcwxstkuuyydnskobll/functions/secrets), go to **Edge Functions → Secrets** and add:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` from step 1.3 |
| `STRIPE_PRICE_ID` | `price_…` from step 1.2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 1.5 |
| `SITE_URL` | your site address from step 2.4, with no slash at the end |

Until these are set, the Buy button shows "Purchases aren't open yet".

## 4. Test a purchase

1. Open your site, click **Kom igång** and create an account with your email and a password.
2. On the payment page, click **Betala och börja** and pay with the test card `4242 4242 4242 4242`, any future date and any CVC.
3. You land back on the welcome page and the app opens straight away.
4. On another device or browser, log in with the same email and password. You should go straight into the app.
5. In the app, open **Settings → Subscription and receipts → Cancel**. In test mode you can end the subscription immediately from the Stripe dashboard. Opening the app afterwards sends you to the payment page.

## 4b. "Forgot password" emails (Resend)

The **Glömt lösenordet?** link on the login page sends a one-time link by email. It works for 60 minutes. Until email is set up, the page asks people to email `info@zaweddeoils.com` instead.

1. Create a free account at [resend.com](https://resend.com).
2. Go to **API Keys → Create API key** and copy the key (`re_…`). Don't paste it into any chat.
3. In the [Supabase Secrets page](https://supabase.com/dashboard/project/ilcwxstkuuyydnskobll/functions/secrets), add `RESEND_API_KEY` with that key.
4. **Testing:** without a domain, Resend only delivers to **your own** email address, from `onboarding@resend.dev`.
5. **For real customers:** once you own a domain, add it in Resend under **Domains** and follow its DNS steps. Then add the secret `MAIL_FROM`, for example `Yiga Oluganda <hej@yigaoluganda.se>`.

## 5. Go live

1. In Stripe, switch off Test mode and complete your business details.
2. Repeat steps 1.2–1.5 in live mode. Live mode has its own price, keys, portal settings and webhook.
3. Replace the three Stripe secrets in Supabase with the live values.

**Before you start selling, finish the legal pages.** They need decisions from you (I'm not a lawyer, so check these with someone who knows Swedish consumer law):

- **Terms of purchase** (`site/terms.html`) and the **privacy policy** (`site/privacy.html`) are drafts. Fill in the [brackets] (company name, org. no., address, date), have them reviewed, then remove the yellow "Utkast" box at the top of each page.
- **Consumer rules for digital services in Sweden:** for example, the 14-day right of withdrawal, and how a buyer agrees to start using the app right away. Stripe Checkout can show a link to your terms.
- **A support address:** the pages currently show `info@zaweddeoils.com`. Change it in `site/*.html` if needed.

## Good to know

- **Security**
  - Passwords are stored only as salted PBKDF2 hashes.
  - The login lives in an HttpOnly cookie that page scripts can't read.
  - After 5 wrong passwords, the account is locked for 15 minutes.
  - The app's files are only served to logged-in subscribers.
- **If a subscription ends** (cancelled or unpaid), access stops within about a minute. The app also checks every time it opens.
- **Forgotten passwords:** handled by the "forgot password" email (step 4b) once Resend is set up.
- **Duels** need live rooms. For now they work only in the Claude-shared version, so the website version hides the Duel tab.
- **Children's progress** is saved on each device. Online sync for website accounts is a possible next step.

## Next steps (optional)

- A welcome email after sign-up, also through Resend.
- A free trial: add `subscription_data[trial_period_days]` to the checkout call in `supabase/functions/yiga-api/index.ts`.
- Duels and online progress for website accounts, using Supabase Realtime.

## Maintenance

- Clean up the test account created during setup, and remove the `pg_net` extension that was only used for testing. Run this in the Supabase SQL editor:
  ```sql
  delete from public.yiga_accounts where subscription_status = 'test_disabled';
  drop extension if exists pg_net;
  ```
- To redeploy the functions with the Supabase CLI:
  ```bash
  supabase functions deploy yiga-api --no-verify-jwt
  supabase functions deploy yiga-stripe-webhook --no-verify-jwt
  ```
  `--no-verify-jwt` is correct here: `yiga-api` does its own login checks, and the webhook checks Stripe's signature.
