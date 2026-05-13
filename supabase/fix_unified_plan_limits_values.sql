alter table public.stores
drop constraint if exists stores_plan_type_check;

alter table public.stores
add constraint stores_plan_type_check
check (plan_type in ('free', 'basic', 'standard', 'plus', 'unli'));

alter table public.stores
alter column plan_type set default 'free';

alter table public.plan_configs
drop constraint if exists plan_configs_plan_type_check;

alter table public.plan_configs
add constraint plan_configs_plan_type_check
check (plan_type in ('free', 'basic', 'standard', 'plus', 'unli'));

do $$
begin
  if to_regclass('public.payment_requests') is not null then
    alter table public.payment_requests
    drop constraint if exists payment_requests_plan_type_check;

    alter table public.payment_requests
    add constraint payment_requests_plan_type_check
    check (plan_type in ('basic', 'standard', 'plus', 'unli'));
  end if;
end $$;

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
