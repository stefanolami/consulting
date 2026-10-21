import 'server-only'

import type { MediaPickerAsset } from '@/components/admin/form/media-picker'
import { FieldError } from '@/lib/admin-action'
import { cleanAlt } from '@/lib/media-alt.mjs'
import { mediaReferencesByAssetId } from '@/lib/media-references'
import { mediaKinds } from '@/lib/media-rules.mjs'
import { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

const PAGE = 500

/**
 * Every asset in the library for the image picker (audit X-10): thumbnail
 * URL, kinds (from current uses and the upload path), and the library alt
 * text per locale, which record editors show read-only (X-09). Paged, so
 * nothing is cut off at the newest 200 or 300.
 */
export async function loadMediaChoices(): Promise<MediaPickerAsset[]> {
	const supabase = await createClient()
	// The assets, their alt text and their uses are read side by side: none
	// depends on another, and reading them one after the other was the
	// slowest part of the editor pages (audit OUT-14).
	const [assets, alts, references] = await Promise.all([loadAllAssets(supabase), loadAllAltRows(supabase), mediaReferencesByAssetId()])
	return assets.map((asset) => ({
		id: asset.id,
		filename: asset.original_filename ?? asset.object_path.split('/').at(-1) ?? asset.id,
		mimeType: asset.mime_type ?? '',
		url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl,
		width: asset.width,
		height: asset.height,
		createdAt: asset.created_at,
		kinds: mediaKinds({ objectPath: asset.object_path, references: references.get(asset.id) ?? [] }),
		uses: (references.get(asset.id) ?? []).length,
		alts: Object.fromEntries(alts.filter((row) => row.media_asset_id === asset.id && cleanAlt(row.alt_text)).map((row) => [row.locale, row.alt_text.trim()])),
	}))
}

async function loadAllAssets(supabase: Client) {
	const assets: Array<{ id: string; bucket_id: string; object_path: string; original_filename: string | null; mime_type: string | null; width: number | null; height: number | null; created_at: string }> = []
	for (let offset = 0; ; offset += PAGE) {
		const { data, error } = await supabase.from('media_assets').select('id, bucket_id, object_path, original_filename, mime_type, width, height, created_at').order('created_at', { ascending: false }).range(offset, offset + PAGE - 1)
		if (error) throw new Error(`Could not load the media library: ${error.message}`)
		assets.push(...(data ?? []))
		if ((data ?? []).length < PAGE) return assets
	}
}

async function loadAllAltRows(supabase: Client) {
	const rows: Array<{ media_asset_id: string; locale: string; alt_text: string }> = []
	for (let offset = 0; ; offset += 1000) {
		const { data, error } = await supabase.from('media_asset_translations').select('media_asset_id, locale, alt_text').order('media_asset_id').order('locale').range(offset, offset + 999)
		if (error) throw new Error(`Could not load media alt text: ${error.message}`)
		rows.push(...(data ?? []))
		if ((data ?? []).length < 1000) return rows
	}
}

/** The library alt text of an asset in one locale (no fallback), or null. */
export async function libraryAltText(supabase: Client, mediaId: string, locale: string) {
	const { data, error } = await supabase.from('media_asset_translations').select('alt_text').eq('media_asset_id', mediaId).eq('locale', locale).maybeSingle()
	if (error) throw new Error(`Could not read the image's alt text: ${error.message}`)
	return cleanAlt(data?.alt_text)
}

/**
 * Publishing a record with an image needs alt text for the image in that
 * locale. Record forms no longer write it (X-09): the editor adds it in the
 * Media library, and the error on `field` says so.
 */
export async function requireLibraryAlt(supabase: Client, { field, label, locale, mediaId }: { field: string; label: string; locale: string; mediaId: string }) {
	if (await libraryAltText(supabase, mediaId, locale)) return
	throw new FieldError(field, `Published content needs the ${label}’s alt text in this language (${locale}). Add it in the Media library with the link above, then save again.`)
}

/** A selected asset must exist and be an image. */
export async function requireImageAsset(supabase: Client, mediaId: string | null | undefined, field: string, label: string) {
	if (!mediaId) return
	const { data, error } = await supabase.from('media_assets').select('mime_type').eq('id', mediaId).maybeSingle()
	if (error) throw new Error(`Could not check the selected ${label}: ${error.message}`)
	if (!data) throw new FieldError(field, `The selected ${label} is no longer in the Media library. Choose another image.`)
	if (!data.mime_type?.startsWith('image/')) throw new FieldError(field, `The ${label} must be an image, not a PDF.`)
}
