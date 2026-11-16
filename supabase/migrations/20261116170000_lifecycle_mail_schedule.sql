-- Switches the welcome and come-back e-mails on: from now, new accounts get them (older accounts
-- never do). Applied together with deploying the lifecycle-mail Edge Function.
insert into private.secrets (name, value) values ('lifecycle_start', now()::text)
on conflict (name) do nothing;

select cron.schedule(
  'yiga-lifecycle-mail',
  '23 * * * *',
  $$
  select net.http_post(
    url := 'https://qbagcpemtsqaoykwqger.supabase.co/functions/v1/lifecycle-mail',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select value from private.secrets where name = 'reminders_cron')
    ),
    body := '{}'::jsonb
  );
  $$
);
