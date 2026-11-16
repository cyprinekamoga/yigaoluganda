-- Schools: class licences. The owner creates a class for a teacher (seats and an end date); students
-- join with the class code and learn without paying until the licence ends; the teacher follows their
-- progress. Schools ask for a licence with the form on yigaoluganda.com/schools.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  school text not null default '' check (char_length(school) <= 120),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{8}$'),
  seats integer not null default 30 check (seats between 1 and 500),
  licence_until date not null,
  created_at timestamptz not null default now()
);
create index classes_teacher on public.classes (teacher_id);
alter table public.classes enable row level security;
create policy "Teachers read their classes" on public.classes
  for select to authenticated using ((select auth.uid()) = teacher_id);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index class_members_user on public.class_members (user_id);
alter table public.class_members enable row level security;
create policy "Students read their memberships" on public.class_members
  for select to authenticated using ((select auth.uid()) = user_id);

-- A class licence counts as access, like a subscription (certificates, native-speaker feedback).
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
  );
$$;
revoke execute on function public.has_access(uuid) from public, anon, authenticated;

-- The classes that give the caller access now (as a student or as the teacher).
create function public.my_licence()
returns table (class_id uuid, name text, school text, licence_until date, teacher boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.school, c.licence_until, c.teacher_id = (select auth.uid())
  from public.classes c
  where c.licence_until >= current_date
    and (c.teacher_id = (select auth.uid())
         or exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = (select auth.uid())))
  order by c.licence_until desc;
$$;

-- A student joins with the code from their teacher.
create function public.join_class(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c public.classes;
begin
  if uid is null then
    return jsonb_build_object('error', 'signed_out');
  end if;
  select * into c from public.classes where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    return jsonb_build_object('error', 'no_class');
  end if;
  if c.licence_until < current_date then
    return jsonb_build_object('error', 'expired');
  end if;
  if not exists (select 1 from public.class_members where class_id = c.id and user_id = uid) then
    if (select count(*) from public.class_members where class_id = c.id) >= c.seats then
      return jsonb_build_object('error', 'full');
    end if;
    insert into public.class_members (class_id, user_id) values (c.id, uid);
  end if;
  return jsonb_build_object('ok', true, 'name', c.name, 'licence_until', c.licence_until);
end;
$$;

-- The teacher (or the owner) sees each student's first name and progress.
create function public.class_progress(p_class uuid)
returns table (name text, joined_at timestamptz, last_active_day date, lessons integer, phrases integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.classes where id = p_class and teacher_id = (select auth.uid()))
     and not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_teacher' using errcode = 'insufficient_privilege';
  end if;
  return query
    select coalesce(p.name, ''), m.joined_at, p.last_active_day,
           coalesce((select count(*) from jsonb_object_keys(coalesce(g.data -> 'done', '{}'::jsonb))), 0)::integer,
           coalesce((select count(*) from jsonb_object_keys(coalesce(g.data -> 'srs', '{}'::jsonb))), 0)::integer
    from public.class_members m
    left join public.profiles p on p.id = m.user_id
    left join public.progress g on g.user_id = m.user_id
    where m.class_id = p_class
    order by lower(coalesce(p.name, ''));
end;
$$;

-- The owner creates a class for a teacher who has an account.
create function public.create_class(p_name text, p_school text, p_teacher_email text, p_seats integer, p_until date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher uuid;
  code text;
  new_id uuid;
begin
  if not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  select id into teacher from auth.users where lower(email) = lower(btrim(p_teacher_email));
  if teacher is null then
    return jsonb_build_object('error', 'no_account');
  end if;
  loop
    code := (
      select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + (get_byte(b, i) % 32), 1), '' order by i)
      from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) as i
    );
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  insert into public.classes (name, school, teacher_id, join_code, seats, licence_until)
  values (btrim(p_name), btrim(coalesce(p_school, '')), teacher, code, greatest(1, least(500, p_seats)), p_until)
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'code', code);
end;
$$;

-- The owner changes a class's seats or end date.
create function public.update_class(p_id uuid, p_seats integer, p_until date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  update public.classes set seats = greatest(1, least(500, p_seats)), licence_until = p_until where id = p_id;
end;
$$;

create function public.owner_classes()
returns table (id uuid, name text, school text, teacher_email text, seats integer, members integer, licence_until date, join_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.school, u.email::text, c.seats,
         (select count(*) from public.class_members m where m.class_id = c.id)::integer, c.licence_until, c.join_code
  from public.classes c join auth.users u on u.id = c.teacher_id
  where exists (select 1 from public.reviewers o where o.user_id = (select auth.uid()) and o.role = 'owner')
  order by c.created_at desc;
$$;

-- Requests from the "For schools" form on the website.
create table public.school_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  school text not null check (char_length(btrim(school)) between 1 and 150),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  students integer check (students between 1 and 2000),
  message text check (char_length(message) <= 2000),
  lang text not null default 'en' check (lang in ('en', 'sv')),
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);
alter table public.school_requests enable row level security;
-- No policies: written through request_school_licence, read by the owner through owner_school_requests.

create function public.request_school_licence(p_name text, p_school text, p_email text, p_students integer, p_message text, p_lang text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A simple brake on floods of requests.
  if (select count(*) from public.school_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many' using errcode = 'check_violation';
  end if;
  insert into public.school_requests (name, school, email, students, message, lang)
  values (btrim(p_name), btrim(p_school), lower(btrim(p_email)), p_students, nullif(btrim(left(coalesce(p_message, ''), 2000)), ''),
          case when p_lang = 'sv' then 'sv' else 'en' end);
  return true;
end;
$$;

create function public.owner_school_requests()
returns setof public.school_requests
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.school_requests r
  where exists (select 1 from public.reviewers o where o.user_id = (select auth.uid()) and o.role = 'owner')
  order by r.created_at desc
  limit 100;
$$;

create function public.handle_school_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.reviewers where user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'not_owner' using errcode = 'insufficient_privilege';
  end if;
  update public.school_requests set status = 'handled' where id = p_id;
end;
$$;

-- Each request is e-mailed to the support address (the review-mail Edge Function).
create function public.school_requests_notify()
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
    body := jsonb_build_object('type', 'school', 'id', new.id)
  );
  return new;
end;
$$;
create trigger school_requests_notify after insert on public.school_requests
  for each row execute function public.school_requests_notify();
revoke execute on function public.school_requests_notify() from public, anon, authenticated;

revoke execute on function public.my_licence() from public, anon;
revoke execute on function public.join_class(text) from public, anon;
revoke execute on function public.class_progress(uuid) from public, anon;
revoke execute on function public.create_class(text, text, text, integer, date) from public, anon;
revoke execute on function public.update_class(uuid, integer, date) from public, anon;
revoke execute on function public.owner_classes() from public, anon;
revoke execute on function public.owner_school_requests() from public, anon;
revoke execute on function public.handle_school_request(uuid) from public, anon;
grant execute on function public.my_licence() to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.class_progress(uuid) to authenticated;
grant execute on function public.create_class(text, text, text, integer, date) to authenticated;
grant execute on function public.update_class(uuid, integer, date) to authenticated;
grant execute on function public.owner_classes() to authenticated;
grant execute on function public.owner_school_requests() to authenticated;
grant execute on function public.handle_school_request(uuid) to authenticated;
revoke execute on function public.request_school_licence(text, text, text, integer, text, text) from public;
grant execute on function public.request_school_licence(text, text, text, integer, text, text) to anon, authenticated;
