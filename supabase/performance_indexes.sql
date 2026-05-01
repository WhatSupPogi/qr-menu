-- QR Menu SaaS performance indexes for 1000-store readiness
-- Safe to run more than once.

create index if not exists idx_stores_slug
on public.stores (slug);

create index if not exists idx_products_store_id
on public.products (store_id);

create index if not exists idx_products_store_id_display_order
on public.products (store_id, display_order);

create index if not exists idx_products_store_id_is_featured
on public.products (store_id, is_featured);
