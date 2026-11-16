-- Welcome e-mails (day 1, 3 and 7 after signing up) and one "come back" e-mail after a
-- subscription ends. Sent by the lifecycle-mail Edge Function; each kind at most once per person.

-- "Tips and news by e-mail" (Settings, and a one-click link in every such e-mail).
alter table public.profiles add column if not exists tips_email boolean not null default true;

create table public.mail_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('welcome_1', 'welcome_3', 'welcome_7', 'come_back')),
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.mail_log enable row level security;
-- No policies: only the Edge Function (service role) reads and writes it.

-- Who is due which e-mail now. Only accounts created after the e-mails were switched on
-- (private.secrets 'lifecycle_start') get welcome e-mails; nothing is due before that is set.
create function public.due_lifecycle()
returns table (id uuid, email text, name text, ui_lang text, kind text, phrases integer)
language sql
stable
security definer
set search_path = ''
as $$
  with start as (
    select value::timestamptz as at from private.secrets where name = 'lifecycle_start'
  ),
  people as (
    select u.id, u.email::text as email, coalesce(p.name, '') as name, coalesce(p.ui_lang, 'en') as ui_lang,
           u.created_at, coalesce((select count(*) from jsonb_object_keys(coalesce(g.data -> 'srs', '{}'::jsonb))), 0)::integer as phrases
    from auth.users u
    join public.profiles p on p.id = u.id
    left join public.progress g on g.user_id = u.id
    where p.tips_email and u.email is not null
  ),
  welcome as (
    select pe.*, k.kind
    from people pe, start
    cross join lateral (values
      ('welcome_1', interval '20 hours', interval '3 days'),
      ('welcome_3', interval '3 days', interval '6 days'),
      ('welcome_7', interval '7 days', interval '12 days')
    ) as k(kind, after_at, until_at)
    where pe.created_at >= start.at
      and now() - pe.created_at >= k.after_at
      and now() - pe.created_at < k.until_at
  ),
  come_back as (
    select pe.*, 'come_back'::text as kind
    from people pe, start
    where exists (
      select 1 from public.subscriptions s
      where s.user_id = pe.id and s.status = 'canceled'
        and s.updated_at >= start.at
        and now() - s.updated_at between interval '2 days' and interval '10 days'
    )
    and not exists (
      select 1 from public.subscriptions s
      where s.user_id = pe.id and s.status in ('active', 'trialing', 'past_due')
    )
  )
  select w.id, w.email, w.name, w.ui_lang, w.kind, w.phrases
  from (select * from welcome union all select * from come_back) w
  where not exists (select 1 from public.mail_log m where m.user_id = w.id and m.kind = w.kind)
    -- Never more than one of these e-mails a day.
    and not exists (select 1 from public.mail_log m where m.user_id = w.id and m.sent_at > now() - interval '20 hours')
  limit 200;
$$;
revoke execute on function public.due_lifecycle() from public, anon, authenticated;
