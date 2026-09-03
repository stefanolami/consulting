-- Extend the existing atomic media deletion guard to protect managed assets
-- referenced by versioned articleImage nodes inside article translation JSON.
-- The public RPC signature and permissions remain unchanged.

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

  delete from storage.objects
  where bucket_id = existing_asset.bucket_id
    and name = existing_asset.object_path;

  delete from public.media_assets
  where id = p_media_asset_id;

  return jsonb_build_object('deleted_media_asset_id', p_media_asset_id);
end;
$$;

revoke all on function public.delete_media_asset(uuid) from public, anon;
grant execute on function public.delete_media_asset(uuid) to authenticated, service_role;

