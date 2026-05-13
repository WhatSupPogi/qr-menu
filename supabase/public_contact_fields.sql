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
