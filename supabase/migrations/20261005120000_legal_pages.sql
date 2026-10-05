-- Admin-managed legal pages: privacy policy, terms and conditions, cookie use.
-- The set of pages is owned by code. This migration creates exactly three
-- canonical rows, and the API grants give staff no way to insert, delete or
-- re-key them. Staff edit and publish the per-locale translations only. Public
-- paths stay in code (the legacy /privacy-policy, /terms-and-conditions and
-- /cookie-use, locale-prefixed outside English), so translations have no slug.
-- See docs/supabase-content-platform.md section 10.

create table public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (
      stable_key in ('privacy-policy', 'terms-and-conditions', 'cookie-use')
    ),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.legal_pages is
  'Code-owned legal pages. Rows are created by migrations only; staff edit translations.';
comment on column public.legal_pages.stable_key is
  'Fixed key mapped to a public path in code. Adding a key requires a migration and code.';
comment on column public.legal_pages.is_active is
  'Operator kill switch. Not writable through the API; change it only by migration or with the service role.';

create table public.legal_page_translations (
  legal_page_id uuid not null
    references public.legal_pages (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  title text not null
    check (char_length(btrim(title)) between 1 and 160),
  content jsonb not null
    default '{"type":"doc","attrs":{"schemaVersion":1},"content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  last_updated_on date
    check (last_updated_on is null or last_updated_on >= date '2000-01-01'),
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (legal_page_id, locale),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null),
  check (status <> 'published' or last_updated_on is not null)
);

comment on column public.legal_page_translations.content is
  'Version-1 legal document: the catalogue rich-text contract plus hard breaks and locale-neutral internal links.';
comment on column public.legal_page_translations.last_updated_on is
  'The "last updated" date shown to visitors, set by the editor. Required to publish. Not derived from published_at, which every save of a published translation re-stamps.';
comment on column public.legal_page_translations.updated_by is
  'Staff member who last saved this locale, stamped from auth.uid() by a trigger. Legal text keeps per-locale attribution; other translation tables do not.';

create index legal_page_translations_locale_status_idx
  on public.legal_page_translations (locale, status, published_at);

create trigger legal_pages_set_updated_at
before update on public.legal_pages
for each row execute function private.set_updated_at();

create trigger legal_page_translations_set_updated_at
before update on public.legal_page_translations
for each row execute function private.set_updated_at();

-- Attribution that a client cannot spoof. For a signed-in request the acting
-- user is taken from auth.uid() and any client-supplied created_by or
-- updated_by is ignored; on update, created_by keeps its stored value. When
-- auth.uid() is null (the service role, the seed script, this migration), the
-- supplied values are kept. Called with 'created_by', the trigger also stamps
-- created_by on insert; without it, only updated_by is stamped.
create or replace function private.stamp_legal_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    return new;
  end if;

  new.updated_by = actor;

  if tg_nargs > 0 and tg_argv[0] = 'created_by' then
    if tg_op = 'INSERT' then
      new.created_by = actor;
    else
      new.created_by = old.created_by;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.stamp_legal_audit() from public, anon;

create trigger legal_pages_stamp_audit
before insert or update on public.legal_pages
for each row execute function private.stamp_legal_audit();

create trigger legal_page_translations_stamp_audit
before insert or update on public.legal_page_translations
for each row execute function private.stamp_legal_audit('created_by');

insert into public.legal_pages (stable_key)
values
  ('privacy-policy'),
  ('terms-and-conditions'),
  ('cookie-use')
on conflict (stable_key) do nothing;

alter table public.legal_pages enable row level security;
alter table public.legal_page_translations enable row level security;

-- Supabase's default privileges give anon and authenticated full table-level
-- privileges on every new table in public. A table-level UPDATE covers every
-- column, so the column grant below would restrict nothing on its own. Revoke
-- everything first, then grant only what this design intends.
revoke all on public.legal_pages from anon, authenticated;
revoke all on public.legal_page_translations from anon, authenticated;

-- Canonical rows: everyone may read (policies below decide which rows). Staff
-- may update only updated_by, so the admin can record that it touched a page;
-- the audit trigger replaces the value sent with auth.uid(). No insert or
-- delete grant: the set of pages is fixed by this migration, and stable_key
-- and is_active cannot be changed through the API.
grant select on public.legal_pages to anon, authenticated;
grant update (updated_by) on public.legal_pages to authenticated;
grant all on public.legal_pages to service_role;

-- Translations: staff create and edit them; deletion is admin-only (policy).
grant select on public.legal_page_translations to anon, authenticated;
grant insert, update, delete on public.legal_page_translations to authenticated;
grant all on public.legal_page_translations to service_role;

-- Visitors see a legal page only while it is active and has at least one
-- translation that is published with a publication time that has passed.
create policy legal_pages_public_select
on public.legal_pages
for select
to anon
using (
  legal_pages.is_active
  and exists (
    select 1
    from public.legal_page_translations translation
    where translation.legal_page_id = legal_pages.id
      and translation.status = 'published'
      and translation.published_at <= now()
  )
);

-- Signed-in users get the public view; active staff also see inactive pages
-- and pages without a published translation, so the admin can list all three.
create policy legal_pages_authenticated_select
on public.legal_pages
for select
to authenticated
using (
  (
    legal_pages.is_active
    and exists (
      select 1
      from public.legal_page_translations translation
      where translation.legal_page_id = legal_pages.id
        and translation.status = 'published'
        and translation.published_at <= now()
    )
  )
  or (select private.is_staff())
);

-- Active staff may update a canonical row. The column grant above limits the
-- update to updated_by.
create policy legal_pages_staff_update
on public.legal_pages
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

-- Visitors see a translation only when it is published, its publication time
-- has passed and its page is active. The parent check is stricter than the
-- other translation tables, whose policies do not check the parent.
create policy legal_page_translations_public_select
on public.legal_page_translations
for select
to anon
using (
  legal_page_translations.status = 'published'
  and legal_page_translations.published_at <= now()
  and exists (
    select 1
    from public.legal_pages page
    where page.id = legal_page_translations.legal_page_id
      and page.is_active
  )
);

-- Signed-in users get the public view; active staff also read drafts,
-- scheduled, archived and future-dated translations for editing and preview.
create policy legal_page_translations_authenticated_select
on public.legal_page_translations
for select
to authenticated
using (
  (
    legal_page_translations.status = 'published'
    and legal_page_translations.published_at <= now()
    and exists (
      select 1
      from public.legal_pages page
      where page.id = legal_page_translations.legal_page_id
        and page.is_active
    )
  )
  or (select private.is_staff())
);

-- Active staff (admins and editors) may add a translation for one of the
-- three pages. Editors may publish, as for all other editorial content.
create policy legal_page_translations_staff_insert
on public.legal_page_translations
for insert
to authenticated
with check ((select private.is_staff()));

-- Active staff may edit, publish, unpublish and archive translations.
create policy legal_page_translations_staff_update
on public.legal_page_translations
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

-- Only active admins may permanently delete a translation, as for the other
-- primary translation tables. Archiving is the normal way to withdraw one.
create policy legal_page_translations_admin_delete
on public.legal_page_translations
for delete
to authenticated
using ((select private.is_admin()));
