alter table public.stores
add column if not exists promo_banner text;

alter table public.products
add column if not exists is_best_seller boolean not null default false;

alter table public.products
add column if not exists is_featured boolean not null default false;

alter table public.products
add column if not exists promo_label text not null default 'none';

alter table public.products
add column if not exists is_combo boolean not null default false;

alter table public.products
add column if not exists description text;

alter table public.products
add column if not exists display_order integer not null default 0;

alter table public.products
drop constraint if exists products_promo_label_check;

alter table public.products
add constraint products_promo_label_check
check (promo_label in ('none', 'HOT', 'SALE', 'NEW'));

insert into public.plan_configs (business_type, plan_type, product_limit, image_limit_kb, photo_count_limit)
values
  ('sari_sari', 'basic', 50, 100, 50),
  ('sari_sari', 'standard', 100, 100, 100),
  ('sari_sari', 'plus', 300, 100, 300),
  ('sari_sari', 'unli', 999999, 100, 999999),
  ('restaurant', 'basic', 50, 100, 50),
  ('restaurant', 'standard', 100, 100, 100),
  ('restaurant', 'plus', 300, 100, 300),
  ('restaurant', 'unli', 999999, 100, 999999)
on conflict (business_type, plan_type) do update
set product_limit = excluded.product_limit,
    image_limit_kb = excluded.image_limit_kb,
    photo_count_limit = excluded.photo_count_limit;
