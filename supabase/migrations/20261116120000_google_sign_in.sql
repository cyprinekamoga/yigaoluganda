-- Sign in with Google: Google gives the full name, so the profile (shown as "Gyebale ko, Ada!")
-- gets the first name, like the e-mail sign-up form asks for. E-mail sign-ups are unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  from_email boolean := coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email';
begin
  insert into public.profiles (id, name, ui_lang)
  values (
    new.id,
    left(
      case
        when from_email then coalesce(meta ->> 'name', '')
        else coalesce(nullif(meta ->> 'given_name', ''), split_part(coalesce(meta ->> 'full_name', meta ->> 'name', ''), ' ', 1))
      end,
      40
    ),
    case when meta ->> 'ui_lang' = 'sv' then 'sv' else 'en' end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
