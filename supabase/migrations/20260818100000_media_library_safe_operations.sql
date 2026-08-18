-- Atomic media-library operations. Storage objects and media metadata live in
-- the same Postgres instance, but the Storage HTTP API cannot make the two
-- deletions atomic. These functions deliberately retain the existing active-
-- staff authorization model and protect every current direct CMS reference.

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

  if existing_asset.object_path <> p_object_path then
    delete from storage.objects
    where bucket_id = existing_asset.bucket_id
      and name = existing_asset.object_path;
  end if;

  return jsonb_build_object('media_asset_id', p_media_asset_id);
end;
$$;

create or replace function public.delete_media_asset(
  p_media_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
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

  delete from storage.objects
  where bucket_id = existing_asset.bucket_id
    and name = existing_asset.object_path;

  delete from public.media_assets
  where id = p_media_asset_id;

  return jsonb_build_object('deleted_media_asset_id', p_media_asset_id);
end;
$$;

revoke all on function public.replace_media_asset(uuid, text, text, text, bigint, integer, integer) from public, anon;
revoke all on function public.delete_media_asset(uuid) from public, anon;

grant execute on function public.replace_media_asset(uuid, text, text, text, bigint, integer, integer) to authenticated, service_role;
grant execute on function public.delete_media_asset(uuid) to authenticated, service_role;
