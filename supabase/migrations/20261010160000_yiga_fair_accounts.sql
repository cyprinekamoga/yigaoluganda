-- Accounts made at a fair (mässa): the seller generates a username and password for a customer.
-- Customers who paid on the spot (Swish/cash) get access until manual_access_until; the others pay by card later.
alter table public.yiga_accounts
  add column is_seller boolean not null default false,
  add column created_by_seller boolean not null default false,
  add column customer_name text,
  add column customer_phone text,
  add column manual_access_until timestamptz;
create index yiga_accounts_fair_idx on public.yiga_accounts (created_at desc) where created_by_seller;
