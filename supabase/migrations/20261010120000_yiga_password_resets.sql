-- One-time links for "forgot password". Only the server functions can use this table.
create table public.yiga_password_resets (
  token_hash text primary key,
  account_id uuid not null references public.yiga_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index yiga_password_resets_account_idx on public.yiga_password_resets (account_id, created_at desc);
alter table public.yiga_password_resets enable row level security;
revoke all on public.yiga_password_resets from anon, authenticated;
