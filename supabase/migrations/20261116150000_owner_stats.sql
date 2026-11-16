-- The owner's dashboard: counts from the app's own tables, no tracking. Only the owner may call it.
create function public.owner_stats()
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
