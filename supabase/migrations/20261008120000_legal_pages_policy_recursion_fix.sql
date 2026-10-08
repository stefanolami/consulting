-- Breaks the row-level-security loop between the two legal tables created by
-- 20261005120000_legal_pages.sql. See docs/supabase-content-platform.md
-- section 11.6.
--
-- Why the loop happened: the select policies on legal_pages checked for a
-- published translation (an EXISTS over legal_page_translations), and the
-- select policies on legal_page_translations checked that the parent page is
-- active (an EXISTS over legal_pages). PostgreSQL applies a table's policies
-- to every subquery that reads that table, and it expands policies when the
-- query is planned, not row by row. So each policy pulled in the other one,
-- and every select, update or delete on either table that went through RLS
-- failed with 42P17 "infinite recursion detected in policy". The
-- `or private.is_staff()` branch of the signed-in policies did not help,
-- because the expansion happens before any condition is evaluated. Only the
-- service role, which bypasses RLS, could read the tables.
--
-- The fix: the legal_pages select policies no longer read
-- legal_page_translations. The translation policies are unchanged and keep
-- their parent-active check, which now reads legal_pages through policies
-- that read nothing else, so the expansion ends there.
--
-- Why the published-translation condition can go from legal_pages: the three
-- keys are fixed by code and every page's footer links to all three paths, so
-- the existence of an active page reveals nothing that is not already public.
-- The legal text itself stays protected by the translation policies
-- (published, publication time passed, page active).
--
-- How this compares with the other canonical tables: every canonical and
-- translation pair has a policy on only one side that reads the other table,
-- which is what keeps them free of loops. For services, sectors, people and
-- tags it is the canonical side (active and has a published translation) and
-- the translation policies do not check the parent. For the legal tables it
-- is now the translation side, so that is_active stays effective for direct
-- API reads of the text, and the canonical rows are visible to anon whenever
-- they are active.
--
-- No grant, trigger, function or translation policy changes. This migration
-- does not use SECURITY DEFINER helpers in the private schema: anon has no
-- USAGE on that schema (20260729190000_core_auth_locales_media.sql), and
-- granting it would expose every private function.

drop policy legal_pages_public_select on public.legal_pages;
drop policy legal_pages_authenticated_select on public.legal_pages;

-- Visitors see a legal page while it is active. Whether it has public text is
-- decided by the translation policies.
create policy legal_pages_public_select
on public.legal_pages
for select
to anon
using (legal_pages.is_active);

-- Signed-in users see active pages; active staff also see inactive ones, so
-- the admin always lists all three.
create policy legal_pages_authenticated_select
on public.legal_pages
for select
to authenticated
using (legal_pages.is_active or (select private.is_staff()));
