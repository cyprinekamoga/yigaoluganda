-- Child profiles (kids mode), certificates, native-speaker feedback on recordings, and
-- "Report a mistake". Everything is owned by the account (auth.users) and removed with it.

-- ---------------------------------------------------------------------------------------------
-- Child profiles: each child learns with their own progress under the parent's account.
-- A first name and the progress are all that is stored about a child.
-- ---------------------------------------------------------------------------------------------
create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index child_profiles_user_id on public.child_profiles (user_id);
alter table public.child_profiles enable row level security;

create policy "Parents read their children" on public.child_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Parents add children" on public.child_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Parents update their children" on public.child_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Parents remove children" on public.child_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- At most four children per account (five learners with the parent).
create function public.child_profiles_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.child_profiles where user_id = new.user_id) >= 4 then
    raise exception 'child_profile_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger child_profiles_limit before insert on public.child_profiles
  for each row execute function public.child_profiles_limit();
revoke execute on function public.child_profiles_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Who may review: the owner and the reviewers the owner adds. Read-only for everyone else.
-- ---------------------------------------------------------------------------------------------
create table public.reviewers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'reviewer' check (role in ('owner', 'reviewer')),
  added_at timestamptz not null default now()
);
alter table public.reviewers enable row level security;
create policy "Users see their own reviewer role" on public.reviewers
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.reviewers where user_id = (select auth.uid()));
$$;

create function public.has_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('active', 'trialing', 'past_due')
  );
$$;
revoke execute on function public.has_access(uuid) from public, anon, authenticated;

-- The owner adds or removes reviewers by e-mail address.
create function public.set_reviewer(p_email text, p_on boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  select id into target from auth.users where lower(email) = lower(btrim(p_email));
  if target is null then
    return 'no_account';
  end if;
  if p_on then
    insert into public.reviewers (user_id) values (target) on conflict (user_id) do nothing;
    return 'added';
  end if;
  delete from public.reviewers where user_id = target and role <> 'owner';
  return 'removed';
end;
$$;

create function public.list_reviewers()
returns table (email text, role text, added_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, r.role, r.added_at
  from public.reviewers r join auth.users u on u.id = r.user_id
  where exists (select 1 from public.reviewers o where o.user_id = (select auth.uid()) and o.role = 'owner')
  order by r.added_at;
$$;

-- ---------------------------------------------------------------------------------------------
-- Feedback from native speakers on a learner's recording of a phrase.
-- Recordings are private (storage bucket "recordings", folder = the learner's user id) and are
-- deleted after 30 days; the reviewer's answer is kept.
-- ---------------------------------------------------------------------------------------------
create table public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase_id text not null check (char_length(phrase_id) <= 40),
  lang text not null default 'en' check (lang in ('en', 'sv')),
  audio_path text check (char_length(audio_path) <= 200),
  status text not null default 'open' check (status in ('open', 'answered', 'expired')),
  rating text check (rating in ('good', 'almost', 'again')),
  tip text check (char_length(tip) <= 500),
  reviewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  seen_at timestamptz
);
create index feedback_requests_user on public.feedback_requests (user_id, created_at desc);
create index feedback_requests_open on public.feedback_requests (created_at) where status = 'open';
alter table public.feedback_requests enable row level security;
create policy "Learners and reviewers read feedback" on public.feedback_requests
  for select to authenticated using ((select auth.uid()) = user_id or (select public.is_reviewer()));

-- A learner with a subscription asks for feedback (at most 5 waiting at a time).
create function public.request_feedback(p_phrase text, p_lang text, p_audio_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_id uuid;
begin
  if uid is null or not public.has_access(uid) then
    raise exception 'no_access' using errcode = 'insufficient_privilege';
  end if;
  if split_part(p_audio_path, '/', 1) <> uid::text then
    raise exception 'bad_path' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.feedback_requests where user_id = uid and status = 'open') >= 5 then
    raise exception 'too_many_waiting' using errcode = 'check_violation';
  end if;
  insert into public.feedback_requests (user_id, phrase_id, lang, audio_path)
  values (uid, p_phrase, case when p_lang = 'sv' then 'sv' else 'en' end, p_audio_path)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.answer_feedback(p_id uuid, p_rating text, p_tip text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_reviewer() then
    raise exception 'not_reviewer' using errcode = 'insufficient_privilege';
  end if;
  update public.feedback_requests
  set status = 'answered', rating = p_rating, tip = nullif(btrim(left(p_tip, 500)), ''),
      reviewer_id = (select auth.uid()), answered_at = now(), seen_at = null
  where id = p_id and status in ('open', 'answered');
end;
$$;

create function public.mark_feedback_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.feedback_requests set seen_at = now()
  where user_id = (select auth.uid()) and status = 'answered' and seen_at is null;
$$;

-- ---------------------------------------------------------------------------------------------
-- "Report a mistake": anything in the course that looks wrong. Reviewers see and close them,
-- and each new one is e-mailed to the support address.
-- ---------------------------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('translation', 'luganda', 'audio', 'typo', 'other')),
  item_type text not null check (item_type in ('phrase', 'sentence', 'lesson', 'dialogue', 'tip', 'other')),
  item_id text check (char_length(item_id) <= 60),
  lesson_id text check (char_length(lesson_id) <= 60),
  note text check (char_length(note) <= 1000),
  lang text not null default 'en' check (lang in ('en', 'sv')),
  platform text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20),
  status text not null default 'open' check (status in ('open', 'fixed', 'not_a_mistake')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index reports_open on public.reports (created_at) where status = 'open';
alter table public.reports enable row level security;
create policy "Learners send reports" on public.reports
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'open' and resolved_at is null and resolved_by is null);
create policy "Reviewers read reports" on public.reports
  for select to authenticated using ((select public.is_reviewer()));

create function public.resolve_report(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_reviewer() then
    raise exception 'not_reviewer' using errcode = 'insufficient_privilege';
  end if;
  update public.reports
  set status = p_status, resolved_at = case when p_status = 'open' then null else now() end,
      resolved_by = case when p_status = 'open' then null else (select auth.uid()) end
  where id = p_id and p_status in ('open', 'fixed', 'not_a_mistake');
end;
$$;

-- E-mail each new report to the support address (the review-mail Edge Function).
create function public.reports_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://qbagcpemtsqaoykwqger.supabase.co/functions/v1/review-mail',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select value from private.secrets where name = 'reminders_cron')
    ),
    body := jsonb_build_object('type', 'report', 'id', new.id)
  );
  return new;
end;
$$;
create trigger reports_notify after insert on public.reports
  for each row execute function public.reports_notify();
revoke execute on function public.reports_notify() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Certificates for finishing a part of the course, checkable by anyone with the code.
-- ---------------------------------------------------------------------------------------------
create table public.certificates (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  learner text not null check (char_length(learner) <= 40),
  learner_name text not null check (char_length(btrim(learner_name)) between 1 and 60),
  part smallint not null check (part between 1 and 9),
  lang text not null default 'en' check (lang in ('en', 'sv')),
  phrases integer not null default 0 check (phrases between 0 and 100000),
  issued_at timestamptz not null default now(),
  unique (user_id, learner, part)
);
alter table public.certificates enable row level security;
create policy "Learners read their certificates" on public.certificates
  for select to authenticated using ((select auth.uid()) = user_id);

-- Issues the certificate (or returns the one already issued, with the name as now given).
-- p_learner is 'main' for the account holder or the id of one of their child profiles.
create function public.issue_certificate(p_learner text, p_name text, p_part integer, p_lang text, p_phrases integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  existing text;
  new_code text;
begin
  if uid is null or not public.has_access(uid) then
    raise exception 'no_access' using errcode = 'insufficient_privilege';
  end if;
  if p_learner <> 'main' and not exists (
    select 1 from public.child_profiles where user_id = uid and id::text = p_learner
  ) then
    raise exception 'unknown_learner' using errcode = 'check_violation';
  end if;
  select code into existing from public.certificates where user_id = uid and learner = p_learner and part = p_part;
  if existing is not null then
    update public.certificates set learner_name = btrim(p_name), lang = case when p_lang = 'sv' then 'sv' else 'en' end
    where code = existing;
    return existing;
  end if;
  -- YO-XXXX-XXXX-XXXX: 12 characters from an alphabet without look-alikes (0/O, 1/I).
  loop
    new_code := 'YO-' || (
      select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 32), 1)
               || case when i in (3, 7) then '-' else '' end, '' order by i)
      from (select extensions.gen_random_bytes(12) as b) r, generate_series(0, 11) as i
    );
    exit when not exists (select 1 from public.certificates where code = new_code);
  end loop;
  insert into public.certificates (code, user_id, learner, learner_name, part, lang, phrases)
  values (new_code, uid, p_learner, btrim(p_name), p_part, case when p_lang = 'sv' then 'sv' else 'en' end, greatest(0, p_phrases));
  return new_code;
end;
$$;

-- Anyone can check a certificate by its code (shows only the name, part and date).
create function public.verify_certificate(p_code text)
returns table (learner_name text, part smallint, phrases integer, issued_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.learner_name, c.part, c.phrases, c.issued_at
  from public.certificates c
  where c.code = upper(btrim(p_code));
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
revoke execute on function public.is_reviewer() from public, anon;
grant execute on function public.is_reviewer() to authenticated;
revoke execute on function public.set_reviewer(text, boolean) from public, anon;
revoke execute on function public.list_reviewers() from public, anon;
revoke execute on function public.request_feedback(text, text, text) from public, anon;
revoke execute on function public.answer_feedback(uuid, text, text) from public, anon;
revoke execute on function public.mark_feedback_seen() from public, anon;
revoke execute on function public.resolve_report(uuid, text) from public, anon;
revoke execute on function public.issue_certificate(text, text, integer, text, integer) from public, anon;
grant execute on function public.set_reviewer(text, boolean) to authenticated;
grant execute on function public.list_reviewers() to authenticated;
grant execute on function public.request_feedback(text, text, text) to authenticated;
grant execute on function public.answer_feedback(uuid, text, text) to authenticated;
grant execute on function public.mark_feedback_seen() to authenticated;
grant execute on function public.resolve_report(uuid, text) to authenticated;
grant execute on function public.issue_certificate(text, text, integer, text, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Private storage for recordings sent for feedback: audio only, up to 2 MB each.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 2097152, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

create policy "Learners upload their recordings" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Learners and reviewers listen to recordings" on storage.objects
  for select to authenticated
  using (bucket_id = 'recordings' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_reviewer())));
create policy "Learners delete their recordings" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------------------------
-- Every morning: delete recordings older than 30 days and e-mail the support address what is
-- waiting for review (the review-mail Edge Function).
-- ---------------------------------------------------------------------------------------------
select cron.schedule(
  'yiga-review-daily',
  '7 6 * * *',
  $$
  select net.http_post(
    url := 'https://qbagcpemtsqaoykwqger.supabase.co/functions/v1/review-mail',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select value from private.secrets where name = 'reminders_cron')
    ),
    body := '{"type":"daily"}'::jsonb
  );
  $$
);
