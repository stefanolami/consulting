-- RLS and grants for the CMS content model.
-- Public reads are publication-aware. Editors manage content; admins may
-- permanently delete primary content records.

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
    'article_authors',
    'article_tags',
    'article_services',
    'article_sectors',
    'article_relations',
    'service_people',
    'sector_people',
    'regions',
    'region_translations',
    'countries',
    'country_translations',
    'country_statistics',
    'country_statistic_translations',
    'country_services',
    'country_service_translations',
    'country_people',
    'offices',
    'office_translations',
    'country_offices',
    'partners',
    'partner_translations',
    'endorsements',
    'endorsement_translations',
    'site_settings',
    'redirects'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );

    execute format(
      'grant select on public.%I to anon, authenticated',
      table_name
    );

    execute format(
      'grant insert, update, delete on public.%I to authenticated',
      table_name
    );

    execute format(
      'grant all on public.%I to service_role',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check ((select private.is_staff()))',
      table_name || '_staff_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using ((select private.is_staff())) '
      'with check ((select private.is_staff()))',
      table_name || '_staff_update',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'article_authors',
    'article_tags',
    'article_services',
    'article_sectors',
    'article_relations',
    'service_people',
    'sector_people',
    'country_statistics',
    'country_statistic_translations',
    'country_services',
    'country_service_translations',
    'country_people',
    'country_offices',
    'redirects'
  ]
  loop
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using ((select private.is_staff()))',
      table_name || '_staff_delete',
      table_name
    );
  end loop;

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
    'offices',
    'office_translations',
    'partners',
    'partner_translations',
    'endorsements',
    'endorsement_translations',
    'site_settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using ((select private.is_admin()))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select *
    from (
      values
        (
          'people',
          $condition$
            people.is_active
            and exists (
              select 1
              from public.people_translations translation
              where translation.person_id = people.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'people_translations',
          $condition$
            people_translations.status = 'published'
            and people_translations.published_at <= now()
          $condition$
        ),
        (
          'tags',
          $condition$
            tags.is_active
            and exists (
              select 1
              from public.tag_translations translation
              where translation.tag_id = tags.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'tag_translations',
          $condition$
            tag_translations.status = 'published'
            and tag_translations.published_at <= now()
          $condition$
        ),
        (
          'services',
          $condition$
            services.is_active
            and exists (
              select 1
              from public.service_translations translation
              where translation.service_id = services.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'service_translations',
          $condition$
            service_translations.status = 'published'
            and service_translations.published_at <= now()
          $condition$
        ),
        (
          'sectors',
          $condition$
            sectors.is_active
            and exists (
              select 1
              from public.sector_translations translation
              where translation.sector_id = sectors.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'sector_translations',
          $condition$
            sector_translations.status = 'published'
            and sector_translations.published_at <= now()
          $condition$
        ),
        (
          'articles',
          $condition$
            exists (
              select 1
              from public.article_translations translation
              where translation.article_id = articles.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'article_translations',
          $condition$
            article_translations.status = 'published'
            and article_translations.published_at <= now()
          $condition$
        ),
        (
          'article_authors',
          $condition$
            exists (
              select 1
              from public.article_translations article_translation
              where article_translation.article_id = article_authors.article_id
                and article_translation.status = 'published'
                and article_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.people person
              join public.people_translations person_translation
                on person_translation.person_id = person.id
              where person.id = article_authors.person_id
                and person.is_active
                and person_translation.status = 'published'
                and person_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'article_tags',
          $condition$
            exists (
              select 1
              from public.article_translations article_translation
              where article_translation.article_id = article_tags.article_id
                and article_translation.status = 'published'
                and article_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.tags tag
              join public.tag_translations tag_translation
                on tag_translation.tag_id = tag.id
              where tag.id = article_tags.tag_id
                and tag.is_active
                and tag_translation.status = 'published'
                and tag_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'article_services',
          $condition$
            exists (
              select 1
              from public.article_translations article_translation
              where article_translation.article_id = article_services.article_id
                and article_translation.status = 'published'
                and article_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.services service
              join public.service_translations service_translation
                on service_translation.service_id = service.id
              where service.id = article_services.service_id
                and service.is_active
                and service_translation.status = 'published'
                and service_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'article_sectors',
          $condition$
            exists (
              select 1
              from public.article_translations article_translation
              where article_translation.article_id = article_sectors.article_id
                and article_translation.status = 'published'
                and article_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.sectors sector
              join public.sector_translations sector_translation
                on sector_translation.sector_id = sector.id
              where sector.id = article_sectors.sector_id
                and sector.is_active
                and sector_translation.status = 'published'
                and sector_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'article_relations',
          $condition$
            exists (
              select 1
              from public.article_translations source_translation
              where source_translation.article_id =
                article_relations.source_article_id
                and source_translation.status = 'published'
                and source_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.article_translations related_translation
              where related_translation.article_id =
                article_relations.related_article_id
                and related_translation.status = 'published'
                and related_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'service_people',
          $condition$
            exists (
              select 1
              from public.service_translations service_translation
              where service_translation.service_id =
                service_people.service_id
                and service_translation.status = 'published'
                and service_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.people person
              join public.people_translations person_translation
                on person_translation.person_id = person.id
              where person.id = service_people.person_id
                and person.is_active
                and person_translation.status = 'published'
                and person_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'sector_people',
          $condition$
            exists (
              select 1
              from public.sector_translations sector_translation
              where sector_translation.sector_id = sector_people.sector_id
                and sector_translation.status = 'published'
                and sector_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.people person
              join public.people_translations person_translation
                on person_translation.person_id = person.id
              where person.id = sector_people.person_id
                and person.is_active
                and person_translation.status = 'published'
                and person_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'regions',
          $condition$
            regions.is_active
            and exists (
              select 1
              from public.region_translations translation
              where translation.region_id = regions.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'region_translations',
          $condition$
            region_translations.status = 'published'
            and region_translations.published_at <= now()
          $condition$
        ),
        (
          'countries',
          $condition$
            countries.is_covered
            and exists (
              select 1
              from public.country_translations translation
              where translation.country_code = countries.code
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'country_translations',
          $condition$
            country_translations.status = 'published'
            and country_translations.published_at <= now()
          $condition$
        ),
        (
          'country_statistics',
          $condition$
            exists (
              select 1
              from public.countries country
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              where country.code = country_statistics.country_code
                and country.is_covered
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'country_statistic_translations',
          $condition$
            exists (
              select 1
              from public.country_statistics statistic
              join public.countries country
                on country.code = statistic.country_code
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              where statistic.id =
                country_statistic_translations.statistic_id
                and country.is_covered
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'country_services',
          $condition$
            exists (
              select 1
              from public.countries country
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              where country.code = country_services.country_code
                and country.is_covered
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.services service
              join public.service_translations service_translation
                on service_translation.service_id = service.id
              where service.id = country_services.service_id
                and service.is_active
                and service_translation.status = 'published'
                and service_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'country_service_translations',
          $condition$
            exists (
              select 1
              from public.country_services country_service
              join public.countries country
                on country.code = country_service.country_code
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              join public.services service
                on service.id = country_service.service_id
              join public.service_translations service_translation
                on service_translation.service_id = service.id
              where country_service.country_code =
                  country_service_translations.country_code
                and country_service.service_id =
                  country_service_translations.service_id
                and country.is_covered
                and service.is_active
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
                and service_translation.status = 'published'
                and service_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'country_people',
          $condition$
            exists (
              select 1
              from public.countries country
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              where country.code = country_people.country_code
                and country.is_covered
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.people person
              join public.people_translations person_translation
                on person_translation.person_id = person.id
              where person.id = country_people.person_id
                and person.is_active
                and person_translation.status = 'published'
                and person_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'offices',
          $condition$
            offices.is_active
            and exists (
              select 1
              from public.office_translations translation
              where translation.office_id = offices.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'office_translations',
          $condition$
            office_translations.status = 'published'
            and office_translations.published_at <= now()
          $condition$
        ),
        (
          'country_offices',
          $condition$
            exists (
              select 1
              from public.countries country
              join public.country_translations country_translation
                on country_translation.country_code = country.code
              where country.code = country_offices.country_code
                and country.is_covered
                and country_translation.status = 'published'
                and country_translation.published_at <= now()
            )
            and exists (
              select 1
              from public.offices office
              join public.office_translations office_translation
                on office_translation.office_id = office.id
              where office.id = country_offices.office_id
                and office.is_active
                and office_translation.status = 'published'
                and office_translation.published_at <= now()
            )
          $condition$
        ),
        (
          'partners',
          $condition$
            partners.is_active
            and exists (
              select 1
              from public.partner_translations translation
              where translation.partner_id = partners.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'partner_translations',
          $condition$
            partner_translations.status = 'published'
            and partner_translations.published_at <= now()
          $condition$
        ),
        (
          'endorsements',
          $condition$
            endorsements.is_active
            and exists (
              select 1
              from public.endorsement_translations translation
              where translation.endorsement_id = endorsements.id
                and translation.status = 'published'
                and translation.published_at <= now()
            )
          $condition$
        ),
        (
          'endorsement_translations',
          $condition$
            endorsement_translations.status = 'published'
            and endorsement_translations.published_at <= now()
          $condition$
        ),
        (
          'site_settings',
          $condition$
            site_settings.is_public
          $condition$
        ),
        (
          'redirects',
          $condition$
            redirects.is_active
          $condition$
        )
    ) as policy_conditions (table_name, public_condition)
  loop
    execute format(
      'create policy %I on public.%I for select to anon using (%s)',
      policy_row.table_name || '_public_select',
      policy_row.table_name,
      policy_row.public_condition
    );

    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using ((%s) or (select private.is_staff()))',
      policy_row.table_name || '_authenticated_select',
      policy_row.table_name,
      policy_row.public_condition
    );
  end loop;
end;
$$;
