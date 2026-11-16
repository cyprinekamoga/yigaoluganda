-- Yearly and Family plans. Each subscription knows its plan (from the Stripe price's lookup key).
-- A Family plan covers up to 6 people: the one who pays, adults they invite (each with their own
-- login), and children's profiles on the payer's account. Children's profiles need a Family plan.

alter table public.subscriptions add column if not exists plan text not null default 'monthly'
  check (plan in ('monthly', 'yearly', 'family_monthly', 'family_yearly'));

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.families enable row level security;
create policy "Owners read their family" on public.families
  for select to authenticated using ((select auth.uid()) = owner_id);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
alter table public.family_members enable row level security;
create policy "Members read their membership" on public.family_members
  for select to authenticated using ((select auth.uid()) = user_id);

-- The account pays for a Family plan that is running.
create function public.family_active(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = owner and s.status in ('active', 'trialing', 'past_due') and s.plan in ('family_monthly', 'family_yearly')
  );
$$;
revoke execute on function public.family_active(uuid) from public, anon, authenticated;

-- People on a family plan: the payer, the members, and the payer's children's profiles.
create function public.family_seats_used(owner uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 1
    + (select count(*) from public.family_members m join public.families f on f.id = m.family_id where f.owner_id = owner)::integer
    + (select count(*) from public.child_profiles c where c.user_id = owner)::integer;
$$;
revoke execute on function public.family_seats_used(uuid) from public, anon, authenticated;

-- Access: a subscription, a class licence, or membership of a running Family plan.
create or replace function public.has_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('active', 'trialing', 'past_due')
  ) or exists (
    select 1 from public.classes c
    where c.licence_until >= current_date
      and (c.teacher_id = uid or exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = uid))
  ) or exists (
    select 1 from public.family_members m join public.families f on f.id = m.family_id
    where m.user_id = uid and public.family_active(f.owner_id)
  );
$$;
revoke execute on function public.has_access(uuid) from public, anon, authenticated;

-- Children's profiles come with the Family plan, within its 6 people.
create or replace function public.child_profiles_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.family_active(new.user_id) then
    raise exception 'family_plan_required' using errcode = 'check_violation';
  end if;
  if public.family_seats_used(new.user_id) >= 6 then
    raise exception 'child_profile_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- The caller's family: as the payer (with the invite code and who is in it) or as a member.
create function public.my_family()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fam public.families;
  code text;
  owner_name text;
begin
  if uid is null then
    return jsonb_build_object('role', null);
  end if;
  if public.family_active(uid) then
    select * into fam from public.families where owner_id = uid;
    if not found then
      loop
        code := (
          select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 32), 1), '' order by i)
          from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) as i
        );
        exit when not exists (select 1 from public.families where invite_code = code);
      end loop;
      insert into public.families (owner_id, invite_code) values (uid, code) returning * into fam;
    end if;
    return jsonb_build_object(
      'role', 'owner',
      'active', true,
      'code', fam.invite_code,
      'seats', 6,
      'used', public.family_seats_used(uid),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(p.name, ''), 'joined_at', m.joined_at) order by m.joined_at)
        from public.family_members m left join public.profiles p on p.id = m.user_id
        where m.family_id = fam.id
      ), '[]'::jsonb)
    );
  end if;
  select f.* into fam from public.families f join public.family_members m on m.family_id = f.id where m.user_id = uid;
  if found then
    select coalesce(name, '') into owner_name from public.profiles where id = fam.owner_id;
    return jsonb_build_object('role', 'member', 'active', public.family_active(fam.owner_id), 'owner_name', owner_name);
  end if;
  return jsonb_build_object('role', null);
end;
$$;

-- Joining a family with the payer's invite code.
create function public.join_family(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fam public.families;
begin
  if uid is null then
    return jsonb_build_object('error', 'signed_out');
  end if;
  select * into fam from public.families where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found or not public.family_active(fam.owner_id) then
    return jsonb_build_object('error', 'no_family');
  end if;
  if fam.owner_id = uid then
    return jsonb_build_object('ok', true);
  end if;
  if exists (select 1 from public.family_members where user_id = uid and family_id = fam.id) then
    return jsonb_build_object('ok', true);
  end if;
  if exists (select 1 from public.family_members where user_id = uid) then
    return jsonb_build_object('error', 'other_family');
  end if;
  if public.family_seats_used(fam.owner_id) >= 6 then
    return jsonb_build_object('error', 'full');
  end if;
  insert into public.family_members (family_id, user_id) values (fam.id, uid);
  return jsonb_build_object('ok', true);
end;
$$;

create function public.leave_family()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.family_members where user_id = (select auth.uid());
$$;

-- The payer removes someone from the family.
create function public.remove_family_member(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.family_members m
  using public.families f
  where m.family_id = f.id and f.owner_id = (select auth.uid()) and m.user_id = p_user;
$$;

revoke execute on function public.my_family() from public, anon;
revoke execute on function public.join_family(text) from public, anon;
revoke execute on function public.leave_family() from public, anon;
revoke execute on function public.remove_family_member(uuid) from public, anon;
grant execute on function public.my_family() to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.leave_family() to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;

-- The owner's dashboard: paying subscriptions by plan and currency (for the revenue estimate).
create or replace function public.owner_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  select jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'new_today', (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day')) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as d
    ),
    'paying', (select count(distinct user_id) from public.subscriptions where status in ('active', 'trialing', 'past_due')),
    'paying_by_currency', (
      select coalesce(jsonb_object_agg(currency, n), '{}'::jsonb)
      from (select upper(coalesce(currency, '?')) as currency, count(*) as n from public.subscriptions where status in ('active', 'trialing', 'past_due') group by 1) c
    ),
    'paying_by_plan', (
      select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'currency', currency, 'n', n)), '[]'::jsonb)
      from (select plan, upper(coalesce(currency, '?')) as currency, count(*) as n from public.subscriptions where status in ('active', 'trialing', 'past_due') group by 1, 2) c
    ),
    'family_members', (select count(*) from public.family_members),
    'past_due', (select count(*) from public.subscriptions where status = 'past_due'),
    'ending', (select count(*) from public.subscriptions where status in ('active', 'trialing') and cancel_at_period_end),
    'new_subs_30d', (select count(*) from public.subscriptions where created_at >= now() - interval '30 days'),
    'cancelled_30d', (select count(*) from public.subscriptions where status = 'canceled' and updated_at >= now() - interval '30 days'),
    'active_7d', (select count(*) from public.profiles where last_active_day >= current_date - 7),
    'reminders_on', (select count(*) from public.profiles where reminder_on),
    'children', (select count(*) from public.child_profiles),
    'certificates', (select count(*) from public.certificates),
    'open_feedback', (select count(*) from public.feedback_requests where status = 'open'),
    'answered_feedback', (select count(*) from public.feedback_requests where status = 'answered'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'top_reported', (
      select coalesce(jsonb_agg(jsonb_build_object('item_type', item_type, 'item_id', item_id, 'n', n, 'open', open_n) order by n desc), '[]'::jsonb)
      from (
        select item_type, item_id, count(*) as n, count(*) filter (where status = 'open') as open_n
        from public.reports group by item_type, item_id order by count(*) desc limit 8
      ) r
    )
  ) into result;
  return result;
end;
$$;
revoke execute on function public.owner_stats() from public, anon;
grant execute on function public.owner_stats() to authenticated;
