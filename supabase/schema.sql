create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  business_type text not null check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other')),
  plan_type text not null check (plan_type in ('free', 'basic', 'standard', 'plus', 'unli')),
  owner_name text not null,
  owner_phone text not null,
  location text not null,
  monthly_price numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.stores
add column if not exists promo_banner text;

alter table public.stores
add column if not exists public_contact_enabled boolean not null default false;

alter table public.stores
add column if not exists public_contact_label text;

alter table public.stores
add column if not exists public_contact_type text not null default 'none';

alter table public.stores
add column if not exists public_contact_value text;

alter table public.stores
drop constraint if exists stores_public_contact_type_check;

alter table public.stores
add constraint stores_public_contact_type_check
check (public_contact_type in ('none', 'messenger', 'facebook', 'phone', 'link'));

create table if not exists public.plan_configs (
  id uuid primary key default gen_random_uuid(),
  business_type text not null check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other')),
  plan_type text not null check (plan_type in ('free', 'basic', 'standard', 'plus', 'unli')),
  product_limit integer not null,
  image_limit_kb integer not null,
  photo_count_limit integer not null,
  unique (business_type, plan_type)
);

alter table public.stores
drop constraint if exists stores_business_type_check;

alter table public.stores
add constraint stores_business_type_check
check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other'));

alter table public.plan_configs
drop constraint if exists plan_configs_business_type_check;

alter table public.plan_configs
add constraint plan_configs_business_type_check
check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other'));

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  auth_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (store_id, auth_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null,
  image_url text,
  image_path text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists is_best_seller boolean not null default false;

alter table public.products
add column if not exists is_featured boolean not null default false;

alter table public.products
add column if not exists promo_label text not null default 'none'
check (promo_label in ('none', 'HOT', 'SALE', 'NEW'));

alter table public.products
add column if not exists is_combo boolean not null default false;

alter table public.products
add column if not exists description text;

alter table public.products
add column if not exists display_order integer not null default 0;

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

alter table public.products
add column if not exists category_id uuid references public.store_categories(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists store_categories_updated_at on public.store_categories;
create trigger store_categories_updated_at before update on public.store_categories
for each row execute function public.set_updated_at();

create table if not exists public.master_admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  success boolean not null,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.master_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique,
  ip_address text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.master_admin_sessions(id) on delete set null,
  action_type text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

insert into public.plan_configs (business_type, plan_type, product_limit, image_limit_kb, photo_count_limit)
values
  ('sari_sari', 'free', 10, 100, 10),
  ('sari_sari', 'basic', 50, 100, 50),
  ('sari_sari', 'standard', 100, 100, 100),
  ('sari_sari', 'plus', 300, 100, 300),
  ('sari_sari', 'unli', 999999, 100, 999999),
  ('restaurant', 'free', 10, 100, 10),
  ('restaurant', 'basic', 50, 100, 50),
  ('restaurant', 'standard', 100, 100, 100),
  ('restaurant', 'plus', 300, 100, 300),
  ('restaurant', 'unli', 999999, 100, 999999),
  ('bar', 'free', 10, 100, 10),
  ('bar', 'basic', 50, 100, 50),
  ('bar', 'standard', 100, 100, 100),
  ('bar', 'plus', 300, 100, 300),
  ('bar', 'unli', 999999, 100, 999999),
  ('coffee_shop', 'free', 10, 100, 10),
  ('coffee_shop', 'basic', 50, 100, 50),
  ('coffee_shop', 'standard', 100, 100, 100),
  ('coffee_shop', 'plus', 300, 100, 300),
  ('coffee_shop', 'unli', 999999, 100, 999999),
  ('cosmetics', 'free', 10, 100, 10),
  ('cosmetics', 'basic', 50, 100, 50),
  ('cosmetics', 'standard', 100, 100, 100),
  ('cosmetics', 'plus', 300, 100, 300),
  ('cosmetics', 'unli', 999999, 100, 999999),
  ('retail', 'free', 10, 100, 10),
  ('retail', 'basic', 50, 100, 50),
  ('retail', 'standard', 100, 100, 100),
  ('retail', 'plus', 300, 100, 300),
  ('retail', 'unli', 999999, 100, 999999),
  ('pharmacy', 'free', 10, 100, 10),
  ('pharmacy', 'basic', 50, 100, 50),
  ('pharmacy', 'standard', 100, 100, 100),
  ('pharmacy', 'plus', 300, 100, 300),
  ('pharmacy', 'unli', 999999, 100, 999999),
  ('electronics', 'free', 10, 100, 10),
  ('electronics', 'basic', 50, 100, 50),
  ('electronics', 'standard', 100, 100, 100),
  ('electronics', 'plus', 300, 100, 300),
  ('electronics', 'unli', 999999, 100, 999999),
  ('clothing', 'free', 10, 100, 10),
  ('clothing', 'basic', 50, 100, 50),
  ('clothing', 'standard', 100, 100, 100),
  ('clothing', 'plus', 300, 100, 300),
  ('clothing', 'unli', 999999, 100, 999999),
  ('other', 'free', 10, 100, 10),
  ('other', 'basic', 50, 100, 50),
  ('other', 'standard', 100, 100, 100),
  ('other', 'plus', 300, 100, 300),
  ('other', 'unli', 999999, 100, 999999)
on conflict (business_type, plan_type) do update
set product_limit = excluded.product_limit,
    image_limit_kb = excluded.image_limit_kb,
    photo_count_limit = excluded.photo_count_limit;

alter table public.stores enable row level security;
alter table public.plan_configs enable row level security;
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.store_categories enable row level security;

drop policy if exists "public can read active stores" on public.stores;
drop policy if exists "store admins can read own store" on public.stores;
drop policy if exists "store admins can update own store basic fields" on public.stores;
drop policy if exists "anyone can read plan configs" on public.plan_configs;
drop policy if exists "store admins can read own mapping" on public.admin_users;
drop policy if exists "public can read products from active stores" on public.products;
drop policy if exists "store admins can insert own products" on public.products;
drop policy if exists "store admins can update own products" on public.products;
drop policy if exists "store admins can delete own products" on public.products;
drop policy if exists "public can read active categories from active stores" on public.store_categories;
drop policy if exists "store admins can manage own categories" on public.store_categories;
drop policy if exists "public can read product images" on storage.objects;
drop policy if exists "service role manages product images" on storage.objects;

create policy "public can read active stores"
on public.stores for select
using (status = 'active');

create policy "store admins can read own store"
on public.stores for select
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.store_id = stores.id and au.auth_id = auth.uid()
  )
);

create policy "store admins can update own store basic fields"
on public.stores for update
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.store_id = stores.id and au.auth_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.store_id = stores.id and au.auth_id = auth.uid()
  )
);

create policy "anyone can read plan configs"
on public.plan_configs for select
using (true);

create policy "store admins can read own mapping"
on public.admin_users for select
to authenticated
using (auth_id = auth.uid());

create policy "public can read products from active stores"
on public.products for select
using (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id and s.status = 'active'
  )
);

create policy "store admins can insert own products"
on public.products for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users au
    where au.store_id = products.store_id and au.auth_id = auth.uid()
  )
);

create policy "store admins can update own products"
on public.products for update
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.store_id = products.store_id and au.auth_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.store_id = products.store_id and au.auth_id = auth.uid()
  )
);

create policy "store admins can delete own products"
on public.products for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.store_id = products.store_id and au.auth_id = auth.uid()
  )
);

create policy "public can read active categories from active stores"
on public.store_categories for select
using (
  is_active = true
  and exists (
    select 1 from public.stores s
    where s.id = store_categories.store_id and s.status = 'active'
  )
);

create policy "store admins can manage own categories"
on public.store_categories for all
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.store_id = store_categories.store_id and au.auth_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.store_id = store_categories.store_id and au.auth_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public can read product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "service role manages product images"
on storage.objects for all
to service_role
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');
