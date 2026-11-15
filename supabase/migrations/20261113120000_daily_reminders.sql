-- Daily reminder e-mails for web learners.
-- The app saves the learner's choice (on/off, hour, time zone) and the last day they practised in
-- public.profiles. Every hour, pg_cron calls the `reminders` Edge Function, which e-mails the
-- learners whose reminder hour it is, who haven't practised today and who have a subscription.

alter table public.profiles
  add column reminder_on boolean not null default false,
  add column reminder_hour smallint not null default 18 check (reminder_hour between 0 and 23),
  add column timezone text not null default 'Europe/Stockholm',
  add column last_active_day date,
  add column last_reminded_on date;

-- An unknown time zone would break the hourly query, so fall back to UTC.
create function public.profiles_check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    new.timezone := 'UTC';
  end if;
  return new;
end;
$$;

create trigger profiles_check_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.profiles_check_timezone();

-- A secret shared by the cron job and the Edge Function, in a schema the API does not expose.
create schema if not exists private;
create table private.secrets (
  name text primary key,
  value text not null
);
insert into private.secrets (name, value)
values ('reminders_cron', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

-- Server-only helpers (service role), used by the reminders function.
create function public.reminders_secret_ok(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.secrets where name = 'reminders_cron' and value = secret);
$$;

create function public.due_reminders()
returns table (id uuid, email text, name text, ui_lang text, local_day date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text, p.name, p.ui_lang, (now() at time zone p.timezone)::date
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.reminder_on
    and u.email is not null
    and extract(hour from (now() at time zone p.timezone)) = p.reminder_hour
    and (p.last_active_day is null or p.last_active_day < (now() at time zone p.timezone)::date)
    and (p.last_reminded_on is null or p.last_reminded_on < (now() at time zone p.timezone)::date)
    and exists (
      select 1 from public.subscriptions s
      where s.user_id = p.id and s.status in ('active', 'trialing', 'past_due')
    );
$$;

create function public.mark_reminded(ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set last_reminded_on = (now() at time zone timezone)::date
  where id = any (ids);
$$;

revoke execute on function public.reminders_secret_ok(text) from public, anon, authenticated;
revoke execute on function public.due_reminders() from public, anon, authenticated;
revoke execute on function public.mark_reminded(uuid[]) from public, anon, authenticated;
grant execute on function public.reminders_secret_ok(text) to service_role;
grant execute on function public.due_reminders() to service_role;
grant execute on function public.mark_reminded(uuid[]) to service_role;

-- The sign-up trigger only fills in name and language; nothing else to change there.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profiles_check_timezone() from public, anon, authenticated;

-- Every hour, on the hour.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'yiga-daily-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://qbagcpemtsqaoykwqger.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select value from private.secrets where name = 'reminders_cron')
    ),
    body := '{}'::jsonb
  );
  $$
);
