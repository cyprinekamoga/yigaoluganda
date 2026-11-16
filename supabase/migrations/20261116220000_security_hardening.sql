-- Security hardening after the November 2026 review.

-- 1. Size limits, so no one can fill the database: progress and children's data at most 256 KB,
--    names and time zones of a sensible length.
alter table public.progress add constraint progress_data_size check (pg_column_size(data) <= 262144);
alter table public.child_profiles add constraint child_profiles_data_size check (data is null or pg_column_size(data) <= 262144);
alter table public.profiles add constraint profiles_name_length check (char_length(coalesce(name, '')) <= 60);
alter table public.profiles add constraint profiles_timezone_length check (char_length(coalesce(timezone, '')) <= 64);

-- 2. "Report a mistake": at most 20 a day per learner, and no e-mail per report (the morning
--    summary from review-mail says how many are waiting).
create function public.reports_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.reports_limit() from public, anon, authenticated;
create trigger reports_limit before insert on public.reports
  for each row execute function public.reports_limit();
drop trigger if exists reports_notify on public.reports;

-- 3. Recordings: at most 20 files per learner (each up to 2 MB), and a list of every file older
--    than 30 days for the daily clean-up (files uploaded without a feedback request included).
drop policy if exists "Learners upload their recordings" on storage.objects;
create policy "Learners upload their recordings" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select count(*) from storage.objects o
         where o.bucket_id = 'recordings' and (storage.foldername(o.name))[1] = (select auth.uid())::text) < 20
  );

create function public.recordings_older_than(p_days integer)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name from storage.objects o
  where o.bucket_id = 'recordings' and o.created_at < now() - make_interval(days => p_days)
  limit 1000;
$$;
revoke execute on function public.recordings_older_than(integer) from public, anon, authenticated;
grant execute on function public.recordings_older_than(integer) to service_role;

-- 4. Narrower table permissions. Row level security already blocks everything not allowed; this is
--    a second layer: signed-out visitors get no table access at all (they only use two functions),
--    and nobody gets TRUNCATE, TRIGGER or REFERENCES.
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke truncate, trigger, references on table public.%I from authenticated', t);
  end loop;
end;
$$;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from authenticated;

-- 5. The 14-day withdrawal: the first one gives a full refund, later ones refund the days not used.
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subscription_id text not null,
  full_refund boolean not null,
  refunded integer not null default 0,
  currency text,
  created_at timestamptz not null default now()
);
create index withdrawals_user on public.withdrawals (user_id);
alter table public.withdrawals enable row level security;
-- No policies: written and read by the withdraw function only. Kept after an account is deleted, so
-- deleting and re-registering doesn't reset the rule (no personal data beyond the account id).

-- 6. Free months (an invite code, or a code like GYEBALEKO) go to a card only once. Stripe's card
--    fingerprint identifies the same card without its number.
create table public.card_fingerprints (
  fingerprint text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (fingerprint, user_id)
);
alter table public.card_fingerprints enable row level security;
-- No policies: written and read by the Stripe functions only. Kept after an account is deleted, for
-- the same reason as withdrawals.

alter table public.referrals drop constraint if exists referrals_status_check;
alter table public.referrals add constraint referrals_status_check check (status in ('joined', 'earned', 'rewarded', 'blocked'));

-- 7. The "For schools" form goes through the school-request function, which limits requests per
--    visitor (a hashed IP address) and can check a bot test; the database function is no longer public.
create table public.request_limits (
  key text not null,
  created_at timestamptz not null default now()
);
create index request_limits_key on public.request_limits (key, created_at);
alter table public.request_limits enable row level security;
revoke execute on function public.request_school_licence(text, text, text, integer, text, text) from anon, authenticated;
grant execute on function public.request_school_licence(text, text, text, integer, text, text) to service_role;
