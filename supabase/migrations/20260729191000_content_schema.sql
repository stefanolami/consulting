-- Database-backed content model for the public site and admin panel.
-- Editorial translations publish independently from their parent records.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null,
  portrait_media_id uuid
    references public.media_assets (id) on delete set null,
  email text,
  phone text,
  website_url text,
  social_links jsonb not null default '{}'::jsonb
    check (jsonb_typeof(social_links) = 'object'),
  is_team_member boolean not null default true,
  is_author boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people_translations (
  person_id uuid not null
    references public.people (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  job_title text,
  short_bio text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (person_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  color text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tag_translations (
  tag_id uuid not null
    references public.tags (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tag_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon_media_id uuid
    references public.media_assets (id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_translations (
  service_id uuid not null
    references public.services (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  summary text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon_media_id uuid
    references public.media_assets (id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sector_translations (
  sector_id uuid not null
    references public.sectors (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  summary text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sector_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'article'
    check (kind ~ '^[a-z][a-z0-9-]*$'),
  cover_media_id uuid
    references public.media_assets (id) on delete set null,
  external_media_url text,
  is_featured boolean not null default false,
  featured_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_translations (
  article_id uuid not null
    references public.articles (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  sources jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sources) = 'array'),
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (article_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.article_authors (
  article_id uuid not null
    references public.articles (id) on delete cascade,
  person_id uuid not null
    references public.people (id) on delete restrict,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (article_id, person_id)
);

create table public.article_tags (
  article_id uuid not null
    references public.articles (id) on delete cascade,
  tag_id uuid not null
    references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create table public.article_services (
  article_id uuid not null
    references public.articles (id) on delete cascade,
  service_id uuid not null
    references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, service_id)
);

create table public.article_sectors (
  article_id uuid not null
    references public.articles (id) on delete cascade,
  sector_id uuid not null
    references public.sectors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, sector_id)
);

create table public.article_relations (
  source_article_id uuid not null
    references public.articles (id) on delete cascade,
  related_article_id uuid not null
    references public.articles (id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (source_article_id, related_article_id),
  check (source_article_id <> related_article_id)
);

create table public.service_people (
  service_id uuid not null
    references public.services (id) on delete cascade,
  person_id uuid not null
    references public.people (id) on delete cascade,
  relationship text not null default 'contact',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (service_id, person_id, relationship)
);

create table public.sector_people (
  sector_id uuid not null
    references public.sectors (id) on delete cascade,
  person_id uuid not null
    references public.people (id) on delete cascade,
  relationship text not null default 'contact',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (sector_id, person_id, relationship)
);

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  map_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(map_config) = 'object'),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.region_translations (
  region_id uuid not null
    references public.regions (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_id, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.countries (
  code text primary key
    check (code ~ '^[A-Z]{2}$'),
  region_id uuid
    references public.regions (id) on delete set null,
  flag_media_id uuid
    references public.media_assets (id) on delete set null,
  outline_media_id uuid
    references public.media_assets (id) on delete set null,
  is_covered boolean not null default false,
  map_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(map_config) = 'object'),
  display_order integer not null default 0,
  last_reviewed_on date,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.country_translations (
  country_code text not null
    references public.countries (code) on update cascade on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  summary text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  coverage_summary text,
  seo_title text,
  seo_description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (country_code, locale),
  unique (locale, slug),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.country_statistics (
  id uuid primary key default gen_random_uuid(),
  country_code text not null
    references public.countries (code) on update cascade on delete cascade,
  metric_key text not null
    check (metric_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  numeric_value numeric,
  unit text,
  statistic_year integer
    check (
      statistic_year is null
      or statistic_year between 1900 and 2200
    ),
  source_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, metric_key)
);

create table public.country_statistic_translations (
  statistic_id uuid not null
    references public.country_statistics (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  label text not null,
  display_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (statistic_id, locale)
);

create table public.country_services (
  country_code text not null
    references public.countries (code) on update cascade on delete cascade,
  service_id uuid not null
    references public.services (id) on delete cascade,
  coverage_level text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (country_code, service_id)
);

create table public.country_service_translations (
  country_code text not null,
  service_id uuid not null,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  summary text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (country_code, service_id, locale),
  foreign key (country_code, service_id)
    references public.country_services (country_code, service_id)
    on update cascade
    on delete cascade
);

create table public.country_people (
  country_code text not null
    references public.countries (code) on update cascade on delete cascade,
  person_id uuid not null
    references public.people (id) on delete cascade,
  relationship text not null default 'expert',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (country_code, person_id, relationship)
);

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code text
    references public.countries (code) on update cascade on delete set null,
  email text,
  phone text,
  latitude numeric(9, 6)
    check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6)
    check (longitude is null or longitude between -180 and 180),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.office_translations (
  office_id uuid not null
    references public.offices (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  name text not null,
  city text,
  address text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (office_id, locale),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.country_offices (
  country_code text not null
    references public.countries (code) on update cascade on delete cascade,
  office_id uuid not null
    references public.offices (id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (country_code, office_id)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  logo_media_id uuid
    references public.media_assets (id) on delete set null,
  website_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_translations (
  partner_id uuid not null
    references public.partners (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  alt_text text not null default '',
  description text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (partner_id, locale),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.endorsements (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null unique
    check (stable_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  partner_id uuid
    references public.partners (id) on delete set null,
  portrait_media_id uuid
    references public.media_assets (id) on delete set null,
  attribution_name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.endorsement_translations (
  endorsement_id uuid not null
    references public.endorsements (id) on delete cascade,
  locale text not null
    references public.locales (code) on update cascade on delete restrict,
  quote text not null,
  attribution_title text,
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (endorsement_id, locale),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create table public.site_settings (
  key text primary key
    check (key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  locale text
    references public.locales (code) on update cascade on delete set null,
  source_path text not null
    check (source_path like '/%'),
  destination_path text not null
    check (destination_path like '/%' or destination_path ~ '^https://'),
  status_code integer not null default 308
    check (status_code in (301, 302, 307, 308)),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, source_path)
);

create unique index redirects_unlocalized_source_path_idx
  on public.redirects (source_path)
  where locale is null;

create index people_active_order_idx
  on public.people (is_active, display_order);
create index people_translations_locale_status_idx
  on public.people_translations (locale, status, published_at);
create index tags_active_order_idx
  on public.tags (is_active, display_order);
create index tag_translations_locale_status_idx
  on public.tag_translations (locale, status, published_at);
create index services_active_order_idx
  on public.services (is_active, display_order);
create index service_translations_locale_status_idx
  on public.service_translations (locale, status, published_at);
create index sectors_active_order_idx
  on public.sectors (is_active, display_order);
create index sector_translations_locale_status_idx
  on public.sector_translations (locale, status, published_at);
create index articles_featured_order_idx
  on public.articles (is_featured, featured_order);
create index article_translations_locale_status_idx
  on public.article_translations (locale, status, published_at);
create index article_authors_person_idx
  on public.article_authors (person_id, display_order);
create index article_tags_tag_idx
  on public.article_tags (tag_id);
create index article_services_service_idx
  on public.article_services (service_id);
create index article_sectors_sector_idx
  on public.article_sectors (sector_id);
create index article_relations_related_idx
  on public.article_relations (related_article_id);
create index service_people_person_idx
  on public.service_people (person_id);
create index sector_people_person_idx
  on public.sector_people (person_id);
create index regions_active_order_idx
  on public.regions (is_active, display_order);
create index region_translations_locale_status_idx
  on public.region_translations (locale, status, published_at);
create index countries_region_covered_order_idx
  on public.countries (region_id, is_covered, display_order);
create index country_translations_locale_status_idx
  on public.country_translations (locale, status, published_at);
create index country_statistics_country_order_idx
  on public.country_statistics (country_code, display_order);
create index country_statistic_translations_locale_idx
  on public.country_statistic_translations (locale);
create index country_services_service_idx
  on public.country_services (service_id);
create index country_service_translations_locale_idx
  on public.country_service_translations (locale);
create index country_people_person_idx
  on public.country_people (person_id);
create index offices_country_active_order_idx
  on public.offices (country_code, is_active, display_order);
create index office_translations_locale_status_idx
  on public.office_translations (locale, status, published_at);
create index country_offices_office_idx
  on public.country_offices (office_id);
create index partners_active_order_idx
  on public.partners (is_active, display_order);
create index partner_translations_locale_status_idx
  on public.partner_translations (locale, status, published_at);
create index endorsements_active_order_idx
  on public.endorsements (is_active, display_order);
create index endorsement_translations_locale_status_idx
  on public.endorsement_translations (locale, status, published_at);
create index redirects_active_source_idx
  on public.redirects (is_active, source_path);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'people',
    'people_translations',
    'tags',
    'tag_translations',
    'services',
    'service_translations',
    'sectors',
    'sector_translations',
    'articles',
    'article_translations',
    'regions',
    'region_translations',
    'countries',
    'country_translations',
    'country_statistics',
    'country_statistic_translations',
    'country_services',
    'country_service_translations',
    'offices',
    'office_translations',
    'partners',
    'partner_translations',
    'endorsements',
    'endorsement_translations',
    'site_settings',
    'redirects'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I '
      'for each row execute function private.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;
