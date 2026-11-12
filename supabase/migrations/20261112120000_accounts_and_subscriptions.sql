-- Accounts, synced progress and Stripe subscriptions for Yiga Oluganda.
-- Users can read (and where it makes sense, write) only their own rows. Stripe data is written
-- only by the Edge Functions, which use the service role.

-- Profile: created automatically when someone signs up.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  ui_lang text not null default 'en' check (ui_lang in ('en', 'sv')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, ui_lang)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 40),
    case when new.raw_user_meta_data ->> 'ui_lang' = 'sv' then 'sv' else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Progress: the app's saved learning state, one JSON document per user.
create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
create policy "Users read their own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own progress" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own progress" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Stripe customer for each user. Server only: no policies, so the app cannot read it.
create table public.customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique
);
alter table public.customers enable row level security;

-- Subscriptions, kept in step with Stripe by the stripe-webhook function. Users can read theirs.
create table public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  price_id text,
  currency text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
create policy "Users read their own subscriptions" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Stripe event ids already handled, so a re-delivered webhook is not applied twice. Server only.
create table public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
