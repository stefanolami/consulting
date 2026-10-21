-- Article kinds become a fixed vocabulary (admin audit NEWS-11, slice 5b;
-- decided by the product owner on 2026-10-21; control tower section 23.11).
--
-- The admin offers these nine keys in a select and its server schema accepts
-- nothing else (src/lib/article-kinds.mjs). This constraint makes the
-- database refuse any other value too, whatever writes it.
--
-- Data: all 21 articles in the development project use a listed kind
-- (checked on 2026-10-21), so no row is changed. The constraint is added
-- NOT VALID and then validated, so a row outside the list (for example in
-- another environment) fails the migration with a clear error instead of
-- being rewritten silently; map it to a listed kind first.
--
-- The original format check (lowercase letters, numbers and hyphens) stays:
-- it is implied by the list but harmless.
--
-- Adding a kind later needs a new migration that drops and re-creates this
-- constraint, plus a label in every messages/*.json and an icon in
-- src/components/newsroom/article-kind.tsx.

alter table public.articles
  add constraint articles_kind_vocabulary
  check (kind in (
    'article',
    'newsletter',
    'announcement',
    'event',
    'video',
    'vodcast',
    'podcast',
    'book',
    'media'
  ))
  not valid;

alter table public.articles
  validate constraint articles_kind_vocabulary;
