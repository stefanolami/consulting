import type { Metadata } from 'next'

import { MediaLibrary } from '@/components/admin/media-library'
import { mediaReferencesByAssetId } from '@/lib/media-references'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Media library' }

export default async function MediaPage() {
	const supabase = await createClient()
	const assets = await allMediaAssets()
	const assetIds = assets.map((asset) => asset.id)
	const uploaderIds = assets.map((asset) => asset.uploaded_by).filter((id): id is string => Boolean(id))
	const [translationsResult, profilesResult, localesResult, references] = await Promise.all([
		assetIds.length ? supabase.from('media_asset_translations').select('media_asset_id, locale, alt_text, caption').in('media_asset_id', assetIds) : Promise.resolve({ data: [], error: null }),
		uploaderIds.length ? supabase.from('profiles').select('id, display_name, email').in('id', uploaderIds) : Promise.resolve({ data: [], error: null }),
		supabase.from('locales').select('code, label').eq('is_active', true).order('display_order'),
		mediaReferencesByAssetId(assetIds),
	])
	const secondaryError = [translationsResult, profilesResult, localesResult].find((result) => result.error)?.error
	if (secondaryError) throw new Error(`Could not load media library details: ${secondaryError.message}`)
	const uploaders = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name || profile.email || null]))
	return <div className="mx-auto max-w-7xl"><MediaLibrary assets={assets.map((asset) => ({ id: asset.id, objectPath: asset.object_path, originalFilename: asset.original_filename, mimeType: asset.mime_type, fileSizeBytes: asset.file_size_bytes, width: asset.width, height: asset.height, uploadedBy: asset.uploaded_by, uploadedByName: asset.uploaded_by ? uploaders.get(asset.uploaded_by) ?? null : null, createdAt: asset.created_at, updatedAt: asset.updated_at, translations: (translationsResult.data ?? []).filter((translation) => translation.media_asset_id === asset.id).map((translation) => ({ locale: translation.locale, altText: translation.alt_text, caption: translation.caption })), references: references.get(asset.id) ?? [] }))} locales={localesResult.data ?? []} /></div>
}

async function allMediaAssets() {
	const supabase = await createClient()
	const assets: Array<{ id: string; object_path: string; original_filename: string | null; mime_type: string | null; file_size_bytes: number | null; width: number | null; height: number | null; uploaded_by: string | null; created_at: string; updated_at: string }> = []
	for (let offset = 0; ; offset += 500) {
		const { data, error } = await supabase.from('media_assets').select('id, object_path, original_filename, mime_type, file_size_bytes, width, height, uploaded_by, created_at, updated_at').order('created_at', { ascending: false }).range(offset, offset + 499)
		if (error) throw new Error(`Could not load media assets: ${error.message}`)
		assets.push(...(data ?? []))
		if ((data ?? []).length < 500) return assets
	}
}
