-- Controlled team-profile model. This is deliberately additive so existing
-- people and published translations remain available while profiles are moved
-- from the legacy single-biography fields to the structured document.

create type public.team_group as enum ('managing_team', 'team');

alter table public.people
  add column team_group public.team_group not null default 'team';

alter table public.people_translations
  add column card_name text,
  add column profile_document jsonb not null default jsonb_build_object(
    'version', 1,
    'intro', jsonb_build_object('content', jsonb_build_object('type', 'doc', 'content', jsonb_build_array())),
    'sections', jsonb_build_array()
  );

comment on column public.people.team_group is
  'The public team directory group. display_order orders members within this group.';
comment on column public.people_translations.card_name is
  'Optional localized name used on the team card; display_name remains the canonical identity.';
comment on column public.people_translations.profile_document is
  'Versioned, controlled profile document: intro rich text, optional endorsement, and ordered titled sections.';

create table public.people_profile_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  locale text not null references public.locales (code) on update cascade on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  card_label text check (card_label is null or char_length(btrim(card_label)) between 1 and 100),
  display_order integer not null default 0 check (display_order >= 0),
  is_card_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, locale, display_order)
);

create unique index people_profile_roles_one_card_role_idx
  on public.people_profile_roles (person_id, locale)
  where is_card_role;

create index people_team_group_order_idx
  on public.people (team_group, display_order, display_name)
  where is_team_member;

create index people_profile_roles_lookup_idx
  on public.people_profile_roles (person_id, locale, display_order);

create trigger people_profile_roles_set_updated_at
before update on public.people_profile_roles
for each row execute function private.set_updated_at();

-- Keep existing content usable as a version-one profile document. New work is
-- written exclusively to profile_document; legacy columns stay for a safe,
-- reversible data migration period.
update public.people_translations
set profile_document = jsonb_build_object(
  'version', 1,
  'intro', jsonb_strip_nulls(jsonb_build_object(
    'content', case
      when short_bio is null or btrim(short_bio) = '' then jsonb_build_object('type', 'doc', 'content', jsonb_build_array())
      else jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', short_bio))
      )))
    end
  )),
  'sections', case
    when content is null or content = jsonb_build_object('type', 'doc', 'content', jsonb_build_array()) then jsonb_build_array()
    else jsonb_build_array(jsonb_build_object('id', 'biography', 'title', 'Biography', 'content', content))
  end
)
where profile_document = jsonb_build_object(
  'version', 1,
  'intro', jsonb_build_object('content', jsonb_build_object('type', 'doc', 'content', jsonb_build_array())),
  'sections', jsonb_build_array()
);

insert into public.people_profile_roles (person_id, locale, title, display_order, is_card_role)
select person_id, locale, job_title, 0, true
from public.people_translations
where job_title is not null and btrim(job_title) <> ''
on conflict (person_id, locale, display_order) do nothing;

alter table public.people_profile_roles enable row level security;

grant select to anon, authenticated on public.people_profile_roles;
grant insert, update, delete to authenticated on public.people_profile_roles;
grant all on public.people_profile_roles to service_role;

create policy people_profile_roles_staff_select
on public.people_profile_roles
for select to authenticated
using ((select private.is_staff()));

create policy people_profile_roles_staff_insert
on public.people_profile_roles
for insert to authenticated
with check ((select private.is_staff()));

create policy people_profile_roles_staff_update
on public.people_profile_roles
for update to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy people_profile_roles_staff_delete
on public.people_profile_roles
for delete to authenticated
using ((select private.is_staff()));

create policy people_profile_roles_public_select
on public.people_profile_roles
for select to anon, authenticated
using (
  exists (
    select 1
    from public.people people
    join public.people_translations translation on translation.person_id = people.id
    where people.id = people_profile_roles.person_id
      and people.is_active
      and translation.locale = people_profile_roles.locale
      and translation.status = 'published'
      and translation.published_at <= now()
  )
);
