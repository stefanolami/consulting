import type { Metadata } from 'next'

import { MediaLibrary } from '@/components/admin/media-library'
import { mediaReferencesByAssetId } from '@/lib/media-references'
import { mediaKinds } from '@/lib/media-rules.mjs'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Media library' }

// ?asset=<id>&locale=<code> opens that asset on that language, for the
// "Edit in the Media library" links in the record editors.
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ asset?: string | string[]; locale?: string | string[] }> }) {
	const { asset: assetParam, locale: localeParam } = await searchParams
	const supabase = await createClient()
	const assets = await allMediaAssets()
	const assetIds = assets.map((asset) => asset.id)
	const uploaderIds = assets.map((asset) => asset.uploaded_by).filter((id): id is string => Boolean(id))
	const [translationsResult, profilesResult, localesResult, references] = await Promise.all([
		loadTranslations(),
		uploaderIds.length ? supabase.from('profiles').select('id, display_name, email').in('id', [...new Set(uploaderIds)]) : Promise.resolve({ data: [], error: null }),
		supabase.from('locales').select('code, label').eq('is_active', true).order('display_order'),
		mediaReferencesByAssetId(assetIds),
	])
	const secondaryError = [profilesResult, localesResult].find((result) => result.error)?.error
	if (secondaryError) throw new Error(`Could not load media library details: ${secondaryError.message}`)
	const uploaders = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name || profile.email || null]))
	return <div className="mx-auto max-w-7xl"><MediaLibrary assets={assets.map((asset) => ({ id: asset.id, objectPath: asset.object_path, url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl, originalFilename: asset.original_filename, mimeType: asset.mime_type, fileSizeBytes: asset.file_size_bytes, width: asset.width, height: asset.height, uploadedBy: asset.uploaded_by, uploadedByName: asset.uploaded_by ? uploaders.get(asset.uploaded_by) ?? null : null, createdAt: asset.created_at, updatedAt: asset.updated_at, translations: translationsResult.filter((translation) => translation.media_asset_id === asset.id).map((translation) => ({ locale: translation.locale, altText: translation.alt_text, caption: translation.caption })), references: references.get(asset.id) ?? [], kinds: mediaKinds({ objectPath: asset.object_path, references: references.get(asset.id) ?? [] }) }))} initialAssetId={typeof assetParam === 'string' ? assetParam : null} initialLocale={typeof localeParam === 'string' ? localeParam : null} locales={localesResult.data ?? []} /></div>
}

async function allMediaAssets() {
	const supabase = await createClient()
	const assets: Array<{ id: string; bucket_id: string; object_path: string; original_filename: string | null; mime_type: string | null; file_size_bytes: number | null; width: number | null; height: number | null; uploaded_by: string | null; created_at: string; updated_at: string }> = []
	for (let offset = 0; ; offset += 500) {
		const { data, error } = await supabase.from('media_assets').select('id, bucket_id, object_path, original_filename, mime_type, file_size_bytes, width, height, uploaded_by, created_at, updated_at').order('created_at', { ascending: false }).range(offset, offset + 499)
		if (error) throw new Error(`Could not load media assets: ${error.message}`)
		assets.push(...(data ?? []))
		if ((data ?? []).length < 500) return assets
	}
}

// Paged, without an `in.(…)` list of every asset id (audit MED-08).
async function loadTranslations() {
	const supabase = await createClient()
	const rows: Array<{ media_asset_id: string; locale: string; alt_text: string; caption: string | null }> = []
	for (let offset = 0; ; offset += 1000) {
		const { data, error } = await supabase.from('media_asset_translations').select('media_asset_id, locale, alt_text, caption').order('media_asset_id').order('locale').range(offset, offset + 999)
		if (error) throw new Error(`Could not load media alt text: ${error.message}`)
		rows.push(...(data ?? []))
		if ((data ?? []).length < 1000) return rows
	}
}
