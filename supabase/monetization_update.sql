alter table public.stores drop constraint if exists stores_plan_type_check;
alter table public.stores add constraint stores_plan_type_check check (plan_type in ('free','basic','standard','plus'));
alter table public.stores alter column plan_type set default 'free';
alter table public.plan_configs drop constraint if exists plan_configs_plan_type_check;
alter table public.plan_configs add constraint plan_configs_plan_type_check check (plan_type in ('free','basic','standard','plus'));
alter table public.stores add column if not exists promo_banner text;
alter table public.products add column if not exists image_path text;
alter table public.products add column if not exists is_best_seller boolean not null default false;
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products add column if not exists promo_label text not null default 'none';
alter table public.products add column if not exists is_combo boolean not null default false;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists display_order integer not null default 0;
alter table public.products drop constraint if exists products_promo_label_check;
alter table public.products add constraint products_promo_label_check check (promo_label in ('none','HOT','SALE','NEW'));
insert into public.plan_configs (business_type, plan_type, product_limit, image_limit_kb, photo_count_limit)
values
 ('sari_sari','free',10,100,3),('sari_sari','basic',50,100,20),('sari_sari','standard',100,100,40),('sari_sari','plus',300,150,120),
 ('restaurant','free',10,300,3),('restaurant','basic',50,300,50),('restaurant','standard',100,300,100),('restaurant','plus',300,300,300)
on conflict (business_type, plan_type) do update
set product_limit=excluded.product_limit,image_limit_kb=excluded.image_limit_kb,photo_count_limit=excluded.photo_count_limit;
create table if not exists public.payment_requests (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 plan_type text not null check (plan_type in ('basic','standard','plus')),
 payment_method text not null check (payment_method in ('GCash','GoTyme','Bank')),
 reference_number text not null,
 proof_image_url text,
 proof_image_path text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.payment_requests enable row level security;
drop policy if exists "store admins can read own payment requests" on public.payment_requests;
drop policy if exists "store admins can insert own payment requests" on public.payment_requests;
create policy "store admins can read own payment requests" on public.payment_requests for select to authenticated using (exists (select 1 from public.admin_users au where au.store_id=payment_requests.store_id and au.auth_id=auth.uid()));
create policy "store admins can insert own payment requests" on public.payment_requests for insert to authenticated with check (exists (select 1 from public.admin_users au where au.store_id=payment_requests.store_id and au.auth_id=auth.uid()));
insert into storage.buckets (id,name,public) values ('payment-proofs','payment-proofs',true) on conflict(id) do nothing;
drop policy if exists "public can read payment proofs" on storage.objects;
drop policy if exists "service role manages payment proofs" on storage.objects;
create policy "public can read payment proofs" on storage.objects for select using (bucket_id='payment-proofs');
create policy "service role manages payment proofs" on storage.objects for all to service_role using (bucket_id='payment-proofs') with check (bucket_id='payment-proofs');
