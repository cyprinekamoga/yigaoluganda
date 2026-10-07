-- Paid accounts for Yiga Oluganda. Only the server functions (service role) touch these tables:
-- RLS is on with no policies, and the public API roles have no privileges at all.

create table public.yiga_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text,
  must_change_password boolean not null default true,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  checkout_session_id text unique,
  subscription_status text not null default 'incomplete',
  current_period_end timestamptz,
  credentials_revealed_at timestamptz,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.yiga_sessions (
  token_hash text primary key,
  account_id uuid not null references public.yiga_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index yiga_sessions_account_idx on public.yiga_sessions (account_id);

-- Stripe may deliver the same event more than once.
create table public.yiga_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.yiga_accounts enable row level security;
alter table public.yiga_sessions enable row level security;
alter table public.yiga_webhook_events enable row level security;

revoke all on public.yiga_accounts, public.yiga_sessions, public.yiga_webhook_events from anon, authenticated;

create or replace function public.yiga_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.yiga_touch_updated_at() from public, anon, authenticated;

create trigger yiga_accounts_updated_at before update on public.yiga_accounts
for each row execute function public.yiga_touch_updated_at();

-- Counts a wrong password atomically (parallel guesses can't slip past the limit) and locks the account for a while after too many.
create or replace function public.yiga_register_failed_login(p_account uuid, p_max integer, p_lock_minutes integer)
returns void language sql security invoker set search_path = '' as $$
  update public.yiga_accounts
     set failed_logins = case when failed_logins + 1 >= p_max then 0 else failed_logins + 1 end,
         locked_until = case when failed_logins + 1 >= p_max then now() + make_interval(mins => p_lock_minutes) else locked_until end
   where id = p_account;
$$;
revoke execute on function public.yiga_register_failed_login(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.yiga_register_failed_login(uuid, integer, integer) to service_role;
