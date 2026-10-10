-- Back from Stripe, the payer is logged in once from the paid checkout (also when they come back on another address or browser).
create table public.yiga_checkout_logins (
  checkout_session_id text primary key,
  account_id uuid not null references public.yiga_accounts (id) on delete cascade,
  used_at timestamptz not null default now()
);
alter table public.yiga_checkout_logins enable row level security;
revoke all on public.yiga_checkout_logins from anon, authenticated;
