alter table public.stores
drop constraint if exists stores_business_type_check;

alter table public.stores
drop constraint if exists stores_plan_type_check;

alter table public.stores
add constraint stores_business_type_check
check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other'));

alter table public.stores
add constraint stores_plan_type_check
check (plan_type in ('free', 'basic', 'standard', 'plus'));

alter table public.plan_configs
drop constraint if exists plan_configs_business_type_check;

alter table public.plan_configs
drop constraint if exists plan_configs_plan_type_check;

alter table public.plan_configs
add constraint plan_configs_business_type_check
check (business_type in ('sari_sari', 'restaurant', 'bar', 'coffee_shop', 'cosmetics', 'retail', 'pharmacy', 'electronics', 'clothing', 'other'));

alter table public.plan_configs
add constraint plan_configs_plan_type_check
check (plan_type in ('free', 'basic', 'standard', 'plus'));

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

drop trigger if exists store_categories_updated_at on public.store_categories;
create trigger store_categories_updated_at before update on public.store_categories
for each row execute function public.set_updated_at();

insert into public.plan_configs (business_type, plan_type, product_limit, image_limit_kb, photo_count_limit)
values
  ('sari_sari', 'free', 10, 100, 3),
  ('sari_sari', 'basic', 50, 100, 20),
  ('sari_sari', 'standard', 100, 100, 40),
  ('sari_sari', 'plus', 300, 150, 120),
  ('restaurant', 'free', 10, 300, 3),
  ('restaurant', 'basic', 50, 300, 50),
  ('restaurant', 'standard', 100, 500, 100),
  ('restaurant', 'plus', 300, 700, 300),
  ('bar', 'free', 10, 500, 3),
  ('bar', 'basic', 50, 500, 20),
  ('bar', 'standard', 100, 500, 40),
  ('bar', 'plus', 300, 500, 120),
  ('coffee_shop', 'free', 10, 300, 3),
  ('coffee_shop', 'basic', 50, 300, 20),
  ('coffee_shop', 'standard', 100, 500, 40),
  ('coffee_shop', 'plus', 300, 500, 120),
  ('cosmetics', 'free', 10, 500, 3),
  ('cosmetics', 'basic', 50, 500, 20),
  ('cosmetics', 'standard', 100, 500, 40),
  ('cosmetics', 'plus', 300, 500, 120),
  ('retail', 'free', 10, 500, 3),
  ('retail', 'basic', 50, 500, 20),
  ('retail', 'standard', 100, 500, 40),
  ('retail', 'plus', 300, 500, 120),
  ('pharmacy', 'free', 10, 500, 3),
  ('pharmacy', 'basic', 50, 500, 20),
  ('pharmacy', 'standard', 100, 500, 40),
  ('pharmacy', 'plus', 300, 500, 120),
  ('electronics', 'free', 10, 500, 3),
  ('electronics', 'basic', 50, 500, 20),
  ('electronics', 'standard', 100, 500, 40),
  ('electronics', 'plus', 300, 500, 120),
  ('clothing', 'free', 10, 500, 3),
  ('clothing', 'basic', 50, 500, 20),
  ('clothing', 'standard', 100, 500, 40),
  ('clothing', 'plus', 300, 500, 120),
  ('other', 'free', 10, 500, 3),
  ('other', 'basic', 50, 500, 20),
  ('other', 'standard', 100, 500, 40),
  ('other', 'plus', 300, 500, 120)
on conflict (business_type, plan_type) do update
set product_limit = excluded.product_limit,
    image_limit_kb = excluded.image_limit_kb,
    photo_count_limit = excluded.photo_count_limit;

alter table public.store_categories enable row level security;

drop policy if exists "public can read active categories from active stores" on public.store_categories;
drop policy if exists "store admins can manage own categories" on public.store_categories;

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
