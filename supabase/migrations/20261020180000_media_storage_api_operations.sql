-- Media replace and delete without deleting from storage.objects in SQL
-- (admin audit MED-01, MED-02, slice 4).
--
-- Why: replace_media_asset (20260818100000) and delete_media_asset (last
-- defined in 20260903120000) end with `delete from storage.objects`.
-- Supabase now refuses that statement ("42501 Direct deletion from storage
-- tables is not allowed. Use the Storage API instead."), so both functions
-- fail and roll back: no replace and no delete can succeed.
--
-- What changes: both functions keep their checks and their row changes, stop
-- touching storage.objects for writes, and return the Storage location the
-- caller must remove. The server action (src/lib/media-operations.mjs) removes
-- that file through the Storage API after the function has committed:
--   - delete: the row is deleted first, then the file is removed;
--   - replace: the new file is uploaded first, the row is switched to it,
--     then the old file is removed.
-- A failure between the two steps leaves an orphaned file (no row points to
-- it), never a row that points to a missing file. Orphans are listed by
-- `npm run media:orphans` and by "Check Storage" in the Media library.
--
-- Unchanged: both names, argument lists, the jsonb return type, SECURITY
-- DEFINER, the active-staff check (private.is_staff()), the row lock, every
-- reference check (including article inline images), the error codes and
-- messages, and the grants (authenticated and service_role may execute;
-- public and anon may not). The returned object only gains keys. No table,
-- policy, bucket or other function changes, and no data changes.
--
-- Rollback: re-running the bodies from 20260818100000 (replace) and
-- 20260903120000 (delete) restores the old behaviour, which Supabase refuses.

-- 1. replace_media_asset: same checks; the update is unchanged; the statement
--    that deleted the old storage.objects row is removed. Reading
--    storage.objects (to check that the uploaded replacement exists) is still
--    allowed, so search_path keeps `storage`. Returns the bucket and the
--    previous object path so the caller can remove the old file.
create or replace function public.replace_media_asset(
  p_media_asset_id uuid,
  p_object_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_width integer,
  p_height integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  existing_asset public.media_assets%rowtype;
begin
  if not (select private.is_staff()) then
    raise exception 'An active staff account is required to replace media.'
      using errcode = '42501';
  end if;

  -- The lock serialises concurrent replacements of one asset, so the
  -- previous path returned below is the one this call replaced.
  select * into existing_asset
  from public.media_assets
  where id = p_media_asset_id
  for update;

  if not found then
    raise exception 'The media asset no longer exists.' using errcode = 'P0002';
  end if;

  if p_object_path is null or btrim(p_object_path) = '' then
    raise exception 'A replacement Storage path is required.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = existing_asset.bucket_id
      and name = p_object_path
  ) then
    raise exception 'The uploaded replacement file could not be found in Storage.'
      using errcode = 'P0002';
  end if;

  update public.media_assets
  set
    object_path = p_object_path,
    original_filename = p_original_filename,
    mime_type = p_mime_type,
    file_size_bytes = p_file_size_bytes,
    width = p_width,
    height = p_height
  where id = p_media_asset_id;

  -- No storage.objects delete here: the caller removes the previous file
  -- through the Storage API after this transaction commits.
  return jsonb_build_object(
    'media_asset_id', p_media_asset_id,
    'bucket_id', existing_asset.bucket_id,
    'previous_object_path', existing_asset.object_path
  );
end;
$$;

-- 2. delete_media_asset: the body of 20260903120000 with the storage.objects
--    delete removed. The function no longer reads the storage schema, so
--    search_path drops `storage`. It refuses an asset that any direct CMS
--    column or any version-2 articleImage node references (the same nine
--    checks), deletes the row (its media_asset_translations rows go with it
--    through the existing ON DELETE CASCADE), and returns the bucket and
--    object path of the file the caller must remove.
create or replace function public.delete_media_asset(
  p_media_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_asset public.media_assets%rowtype;
  references_found text[] := array[]::text[];
  reference_labels text;
begin
  if not (select private.is_staff()) then
    raise exception 'An active staff account is required to delete media.'
      using errcode = '42501';
  end if;

  -- The lock keeps a concurrent replace from changing the path returned
  -- below while the references are checked.
  select * into existing_asset
  from public.media_assets
  where id = p_media_asset_id
  for update;

  if not found then
    raise exception 'The media asset no longer exists.' using errcode = 'P0002';
  end if;

  select string_agg(display_name, ', ' order by display_name)
  into reference_labels
  from public.people
  where portrait_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'people: ' || reference_labels);
  end if;

  select string_agg(stable_key, ', ' order by stable_key)
  into reference_labels
  from public.services
  where icon_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'services: ' || reference_labels);
  end if;

  select string_agg(stable_key, ', ' order by stable_key)
  into reference_labels
  from public.sectors
  where icon_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'sectors: ' || reference_labels);
  end if;

  select string_agg(stable_key, ', ' order by stable_key)
  into reference_labels
  from public.articles
  where cover_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'articles: ' || reference_labels);
  end if;

  select string_agg(
    article.stable_key || ' (' || translation.locale || ')',
    ', ' order by article.stable_key, translation.locale
  )
  into reference_labels
  from public.article_translations translation
  join public.articles article on article.id = translation.article_id
  where jsonb_path_exists(
    translation.content,
    '$.content[*] ? (@.type == "articleImage" && @.attrs.mediaId == $mediaId)',
    jsonb_build_object('mediaId', to_jsonb(p_media_asset_id::text))
  );
  if reference_labels is not null then
    references_found := array_append(references_found, 'article inline images: ' || reference_labels);
  end if;

  select string_agg(code, ', ' order by code)
  into reference_labels
  from public.countries
  where flag_media_id = p_media_asset_id
     or outline_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'countries: ' || reference_labels);
  end if;

  select string_agg(name, ', ' order by name)
  into reference_labels
  from public.partners
  where logo_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'partners: ' || reference_labels);
  end if;

  select string_agg(attribution_name, ', ' order by attribution_name)
  into reference_labels
  from public.endorsements
  where portrait_media_id = p_media_asset_id;
  if reference_labels is not null then
    references_found := array_append(references_found, 'endorsements: ' || reference_labels);
  end if;

  if cardinality(references_found) > 0 then
    raise exception 'Cannot delete media while it is referenced by %.', array_to_string(references_found, '; ')
      using errcode = 'P0001';
  end if;

  delete from public.media_assets
  where id = p_media_asset_id;

  -- No storage.objects delete here: the caller removes the file through the
  -- Storage API after this transaction commits.
  return jsonb_build_object(
    'deleted_media_asset_id', p_media_asset_id,
    'bucket_id', existing_asset.bucket_id,
    'object_path', existing_asset.object_path
  );
end;
$$;

-- 3. Permissions, restated unchanged. CREATE OR REPLACE keeps a function's
--    existing grants; these statements make the intended state explicit.
revoke all on function public.replace_media_asset(uuid, text, text, text, bigint, integer, integer) from public, anon;
revoke all on function public.delete_media_asset(uuid) from public, anon;

grant execute on function public.replace_media_asset(uuid, text, text, text, bigint, integer, integer) to authenticated, service_role;
grant execute on function public.delete_media_asset(uuid) to authenticated, service_role;
