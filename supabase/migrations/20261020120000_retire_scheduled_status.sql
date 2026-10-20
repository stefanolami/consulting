-- Publication model, admin audit slice 3 (platform doc §4).
--
-- "Scheduled" is no longer a stored status. A scheduled translation is stored
-- as status 'published' with published_at in the future: the public RLS
-- policies (status = 'published' and published_at <= now()) and the public
-- readers already hide it until that moment, so nothing has to run to
-- publish it. The admin shows such a row as "Scheduled", derived from the
-- date. scheduled_for is no longer written; the admin keeps reading it only
-- for rows still stored with the old status.
--
-- This migration converts the rows still stored as 'scheduled'. It changes
-- data and comments only: no table, column, policy, function or type is
-- added, changed or dropped. The enum value stays, because Postgres cannot
-- drop an enum value in place, and keeping it lets this migration and older
-- rows coexist with the application.

-- For every editorial translation table, in one transaction:
--
-- 1. A schedule still ahead becomes the new form: status 'published' with
--    published_at = scheduled_for, and scheduled_for cleared. The row goes
--    live at the time the editor chose, as they intended. A legal
--    translation also needs last_updated_on to be published (a check on that
--    table); one without it is left to step 2.
--
-- 2. Every other 'scheduled' row had its time pass without being published
--    (nothing ever published scheduled rows, audit X-05). Publishing it now,
--    unreviewed, could put forgotten content live, so it becomes a draft. It
--    keeps the intended time in published_at, which the admin shows (the
--    article date) and uses as the publication date if an editor publishes
--    it; scheduled_for is cleared.
--
-- updated_at changes on the converted rows through the existing
-- set_updated_at triggers. The legal audit trigger keeps updated_by, because
-- auth.uid() is null in a migration.
do $$
declare
  translation_table text;
begin
  foreach translation_table in array array[
    'people_translations',
    'tag_translations',
    'service_translations',
    'sector_translations',
    'article_translations',
    'region_translations',
    'country_translations',
    'office_translations',
    'partner_translations',
    'endorsement_translations',
    'legal_page_translations'
  ]
  loop
    execute format(
      $sql$
        update public.%I
        set status = 'published', published_at = scheduled_for, scheduled_for = null
        where status = 'scheduled'
          and scheduled_for > now()
          %s
      $sql$,
      translation_table,
      case when translation_table = 'legal_page_translations' then 'and last_updated_on is not null' else '' end
    );

    execute format(
      $sql$
        update public.%I
        set status = 'draft', published_at = coalesce(published_at, scheduled_for), scheduled_for = null
        where status = 'scheduled'
      $sql$,
      translation_table
    );
  end loop;
end
$$;

-- The stored documentation of the model. The first two describe the new
-- rule; the third replaces a comment that said published_at is re-stamped on
-- every save, which is no longer true.
comment on type public.content_status is
  'Stored translation status: draft, published or archived. A scheduled translation is published with a future published_at (hidden by RLS until then); the value scheduled is retired and no longer written.';

comment on column public.article_translations.published_at is
  'The article date: set on the first publish or chosen by the editor (legacy articles keep their original date), kept by later saves, unpublishing and archiving. A future value schedules the article.';

comment on column public.legal_page_translations.last_updated_on is
  'The "last updated" date shown to visitors, set by the editor. Required to publish. Separate from published_at, which records when the translation was first published.';
