-- Core application roles, staff profiles, locales, media metadata, and Storage.
-- Staff accounts are inactive by default and must be activated deliberately.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.app_role as enum ('admin', 'editor');
create type public.content_status as enum (
  'draft',
  'scheduled',
  'published',
  'archived'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'editor',
  is_active boolean not null default false,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Invite-only admin identities and application authorization roles.';
comment on column public.profiles.is_active is
  'New Auth users remain unauthorized until an administrator activates them.';

create index profiles_active_role_idx
  on public.profiles (is_active, role);

create table public.locales (
  code text primary key
    check (code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  label text not null,
  native_label text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index locales_one_default_idx
  on public.locales (is_default)
  where is_default;

insert into public.locales (
  code,
  label,
  native_label,
  is_default,
  display_order
)
values
  ('en', 'English', 'English', true, 10),
  ('de', 'German', 'Deutsch', false, 20),
  ('it', 'Italian', 'Italiano', false, 30),
  ('pt-BR', 'Brazilian Portuguese', 'Português (Brasil)', false, 40),
  ('pt-PT', 'Portuguese', 'Português (Portugal)', false, 50);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'public-media',
  object_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint
    check (file_size_bytes is null or file_size_bytes >= 0),
  width integer
    check (width is null or width > 0),
  height integer
    check (height is null or height > 0),
  checksum text,
  is_public boolean not null default true,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create index media_assets_uploaded_by_idx
  on public.media_assets (uploaded_by);

create table public.media_asset_translations (
  media_asset_id uuid not null
    references public.media_assets (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  alt_text text not null default '',
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (media_asset_id, locale)
);

create index media_asset_translations_locale_idx
  on public.media_asset_translations (locale);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger locales_set_updated_at
before update on public.locales
for each row execute function private.set_updated_at();

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

create trigger media_asset_translations_set_updated_at
before update on public.media_asset_translations
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('admin', 'editor')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = 'admin'
  );
$$;

revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.locales enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_translations enable row level security;

grant select on public.profiles to authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy profiles_admin_insert
on public.profiles
for insert
to authenticated
with check ((select private.is_admin()));

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy profiles_admin_delete
on public.profiles
for delete
to authenticated
using ((select private.is_admin()));

grant select on public.locales to anon, authenticated;
grant insert, update, delete on public.locales to authenticated;
grant all on public.locales to service_role;

create policy locales_public_select
on public.locales
for select
to anon
using (is_active);

create policy locales_authenticated_select
on public.locales
for select
to authenticated
using (
  is_active
  or (select private.is_staff())
);

create policy locales_staff_insert
on public.locales
for insert
to authenticated
with check ((select private.is_staff()));

create policy locales_staff_update
on public.locales
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy locales_admin_delete
on public.locales
for delete
to authenticated
using ((select private.is_admin()));

grant select on public.media_assets, public.media_asset_translations
  to anon, authenticated;
grant insert, update, delete
  on public.media_assets, public.media_asset_translations
  to authenticated;
grant all
  on public.media_assets, public.media_asset_translations
  to service_role;

create policy media_assets_public_select
on public.media_assets
for select
to anon
using (is_public);

create policy media_assets_authenticated_select
on public.media_assets
for select
to authenticated
using (
  is_public
  or (select private.is_staff())
);

create policy media_assets_staff_insert
on public.media_assets
for insert
to authenticated
with check ((select private.is_staff()));

create policy media_assets_staff_update
on public.media_assets
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy media_assets_staff_delete
on public.media_assets
for delete
to authenticated
using ((select private.is_staff()));

create policy media_asset_translations_public_select
on public.media_asset_translations
for select
to anon
using (
  exists (
    select 1
    from public.media_assets
    where media_assets.id = media_asset_id
      and media_assets.is_public
  )
);

create policy media_asset_translations_authenticated_select
on public.media_asset_translations
for select
to authenticated
using (
  exists (
    select 1
    from public.media_assets
    where media_assets.id = media_asset_id
      and media_assets.is_public
  )
  or (select private.is_staff())
);

create policy media_asset_translations_staff_insert
on public.media_asset_translations
for insert
to authenticated
with check ((select private.is_staff()));

create policy media_asset_translations_staff_update
on public.media_asset_translations
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy media_asset_translations_staff_delete
on public.media_asset_translations
for delete
to authenticated
using ((select private.is_staff()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'public-media',
  'public-media',
  true,
  15728640,
  array[
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy public_media_staff_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_staff())
);

create policy public_media_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and (select private.is_staff())
);

create policy public_media_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_staff())
)
with check (
  bucket_id = 'public-media'
  and (select private.is_staff())
);

create policy public_media_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-media'
  and (select private.is_staff())
);
