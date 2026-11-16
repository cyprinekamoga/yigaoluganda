-- Refer a friend: each paying learner gets a personal code (a Stripe promotion code that gives a
-- first-time customer their first month free). When the friend has paid for a month after the free
-- one, the learner earns a free month, applied to their subscription one at a time.
create table public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9-]{4,24}$'),
  promotion_code_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
create policy "Learners read their own code" on public.referral_codes
  for select to authenticated using ((select auth.uid()) = user_id);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null unique references auth.users (id) on delete cascade,
  code text not null,
  status text not null default 'joined' check (status in ('joined', 'earned', 'rewarded')),
  created_at timestamptz not null default now(),
  earned_at timestamptz,
  rewarded_at timestamptz,
  check (referrer_id <> friend_id)
);
create index referrals_referrer on public.referrals (referrer_id, status);
alter table public.referrals enable row level security;
-- The learner sees how their invitations went (not who the friends are: no names or e-mails here).
create policy "Learners read their referrals" on public.referrals
  for select to authenticated using ((select auth.uid()) = referrer_id);
