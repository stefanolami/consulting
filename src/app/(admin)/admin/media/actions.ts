'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, failed, FieldError, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { optionalText } from '@/lib/admin-schema.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_CATALOGUE_CACHE_TAG, PUBLIC_GLOBAL_CACHE_TAG, PUBLIC_NEWSROOM_CACHE_TAG, PUBLIC_OUTREACH_CACHE_TAG, PUBLIC_TEAM_CACHE_TAG } from '@/lib/cache-tags'
import { MEDIA_BUCKET, mediaObjectPath, validateMediaFile } from '@/lib/media-library'
import { deleteMediaAsset, findMediaStorageDrift, replaceMediaAsset, type MediaOrphan, type MediaStorageDrift } from '@/lib/media-operations.mjs'
import { kindFromPath, MEDIA_KINDS, type MediaKind } from '@/lib/media-rules.mjs'
import { mediaReferencesByAssetId } from '@/lib/media-references'
import { createClient } from '@/lib/supabase/server'

const localeSchema = z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, 'Choose a valid locale.')
const assetIdSchema = z.string().uuid('Choose a valid media asset.')

// The file checks in validateMediaFile describe the chosen file.
async function fileField<T>(validate: () => Promise<T>) {
	try {
		return await validate()
	} catch (error) {
		throw new FieldError('file', error instanceof Error ? error.message : 'This file cannot be used.')
	}
}

function refreshMediaLibrary() {
	updateTag(PUBLIC_CATALOGUE_CACHE_TAG)
	updateTag(PUBLIC_GLOBAL_CACHE_TAG)
	updateTag(PUBLIC_NEWSROOM_CACHE_TAG)
	updateTag(PUBLIC_OUTREACH_CACHE_TAG)
	updateTag(PUBLIC_TEAM_CACHE_TAG)
	revalidatePath('/admin/media')
	revalidatePath('/[locale]', 'page')
	// Revalidate public media consumers when a shared asset changes.
	revalidatePath('/[locale]/who-we-are', 'page')
	revalidatePath('/[locale]/who-we-are/[slug]', 'page')
	revalidatePath('/[locale]/services', 'page')
	revalidatePath('/[locale]/services/[slug]', 'page')
	revalidatePath('/[locale]/sectors', 'page')
	revalidatePath('/[locale]/sectors/[slug]', 'page')
	revalidatePath('/[locale]/newsroom', 'page')
	revalidatePath('/[locale]/newsroom/[slug]', 'page')
	revalidatePath('/[locale]/our-outreach', 'page')
	revalidatePath('/[locale]/our-outreach/[slug]', 'page')
}

export type UploadedMedia = { assetId: string; filename: string; mimeType: string; url: string; width: number | null; height: number | null; createdAt: string; kind: MediaKind | null; altText: string | null }

const kindSchema = z.enum(MEDIA_KINDS as unknown as [MediaKind, ...MediaKind[]]).nullable().catch(null)

/**
 * Uploads one file to the library. The Media library and the image picker
 * both use it. `kind` (portrait, icon, …) is kept in the Storage path for the
 * picker's filter; `imagesOnly` refuses PDFs for image fields. The English
 * alt text and caption describe the new asset in the library.
 */
export async function uploadMediaAssetAction(formData: FormData): Promise<AdminActionResult<UploadedMedia>> {
	return adminAction('Could not upload the file.', async () => {
		const file = formData.get('file')
		if (!(file instanceof File) || !file.size) throw new FieldError('file', 'Choose a file to upload.')
		const altText = optionalText(320).parse(formData.get('altText'))
		const caption = optionalText(2_000).parse(formData.get('caption'))
		const kind = kindSchema.parse(formData.get('kind') || null)
		const imagesOnly = formData.get('imagesOnly') === 'true'
		const { profile } = await requireActiveStaff()
		const media = await fileField(() => validateMediaFile(file, { imagesOnly }))
		const path = mediaObjectPath(kind, media.mimeType)
		const supabase = await createClient()
		const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, media.bytes, {
			cacheControl: '31536000', contentType: media.mimeType, upsert: false,
		})
		if (uploadError) return failed(`Could not upload “${media.originalFilename}”: ${uploadError.message}`)
		const { data: asset, error: assetError } = await supabase.from('media_assets').insert({
			bucket_id: MEDIA_BUCKET, object_path: path, original_filename: media.originalFilename,
			mime_type: media.mimeType, file_size_bytes: media.fileSizeBytes, width: media.width,
			height: media.height, uploaded_by: profile.id,
		}).select('id, created_at').single()
		if (assetError) {
			await supabase.storage.from(MEDIA_BUCKET).remove([path])
			return failed(`The file was uploaded but its media record could not be created, so the file was removed again: ${assetError.message}`)
		}
		const uploaded: UploadedMedia = {
			assetId: asset.id, filename: media.originalFilename, mimeType: media.mimeType, kind, altText,
			url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl,
			width: media.width, height: media.height, createdAt: asset.created_at,
		}
		if (altText || caption) {
			const { error: translationError } = await supabase.from('media_asset_translations').insert({ media_asset_id: asset.id, locale: 'en', alt_text: altText ?? '', caption })
			if (translationError) {
				refreshMediaLibrary()
				return succeeded(`“${media.originalFilename}” is in the library, but its English alt text could not be saved (${translationError.message}). Add it in the Media library.`, { ...uploaded, altText: null })
			}
		}
		refreshMediaLibrary()
		return succeeded(`“${media.originalFilename}” uploaded to the library.`, uploaded)
	})
}

export async function saveMediaMetadataAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update file metadata.', async () => {
		const parsed = z.object({ assetId: assetIdSchema, originalFilename: z.string().trim().min(1).max(512).refine((value) => !/[\\/\u0000-\u001f]/.test(value), 'Use a filename without path separators or control characters.') }).parse({ assetId: formData.get('assetId'), originalFilename: formData.get('originalFilename') })
		await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from('media_assets').update({ original_filename: parsed.originalFilename }).eq('id', parsed.assetId)
		if (error) return failed(`Could not update file metadata: ${error.message}`)
		refreshMediaLibrary()
		return succeeded('File metadata updated.')
	})
}

export async function saveMediaTranslationAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save localized media metadata.', async () => {
		const parsed = z.object({ assetId: assetIdSchema, locale: localeSchema, altText: optionalText(320), caption: optionalText(2_000) }).parse({ assetId: formData.get('assetId'), locale: formData.get('locale'), altText: formData.get('altText'), caption: formData.get('caption') })
		await requireActiveStaff()
		const supabase = await createClient()
		const { data: locale, error: localeError } = await supabase.from('locales').select('code').eq('code', parsed.locale).eq('is_active', true).maybeSingle()
		if (localeError || !locale) return failed(`That locale is not available: ${localeError?.message ?? 'choose an active locale.'}`)
		const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: parsed.assetId, locale: parsed.locale, alt_text: parsed.altText ?? '', caption: parsed.caption }, { onConflict: 'media_asset_id,locale' })
		if (error) return failed(`Could not save localized media metadata: ${error.message}`)
		refreshMediaLibrary()
		return succeeded(`${parsed.locale} metadata saved.`)
	})
}

export async function replaceMediaAssetAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not replace the file.', async () => {
		const assetId = assetIdSchema.parse(formData.get('assetId'))
		const file = formData.get('file')
		if (!(file instanceof File) || !file.size) throw new FieldError('file', 'Choose a replacement file.')
		await requireActiveStaff()
		const supabase = await createClient()
		const { data: current, error: currentError } = await supabase.from('media_assets').select('object_path, mime_type').eq('id', assetId).maybeSingle()
		if (currentError) return failed(`Could not load the asset: ${currentError.message}`)
		if (!current) return failed('This asset is no longer in the library.')
		// An image stays an image: a PDF would break every page that shows it.
		const media = await fileField(() => validateMediaFile(file, { imagesOnly: Boolean(current.mime_type?.startsWith('image/')) }))
		const result = await replaceMediaAsset(supabase, {
			assetId, bucket: MEDIA_BUCKET, path: mediaObjectPath(kindFromPath(current.object_path), media.mimeType),
			file: { bytes: media.bytes, mimeType: media.mimeType, originalFilename: media.originalFilename, fileSizeBytes: media.fileSizeBytes, width: media.width, height: media.height },
		})
		if (!result.ok) return failed(`The file was not replaced. ${result.message}${result.orphan ? ` ${orphanNote(result.orphan)}` : ''}`)
		refreshMediaLibrary()
		return succeeded(`File replaced. Every page that uses this asset now shows the new file.${result.orphan ? ` ${orphanNote(result.orphan)}` : ''}`)
	})
}

export async function deleteMediaAssetAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not delete the asset.', async () => {
		const assetId = assetIdSchema.parse(formData.get('assetId'))
		await requireActiveStaff()
		const references = await mediaReferencesByAssetId([assetId])
		const assetReferences = references.get(assetId) ?? []
		if (assetReferences.length) return failed(`This asset is in use by ${assetReferences.map((reference) => `${reference.type.toLowerCase()} “${reference.label}”`).join(', ')}. Remove or replace those references before deleting it.`)
		const supabase = await createClient()
		const result = await deleteMediaAsset(supabase, assetId)
		if (!result.ok) return failed(`The asset was not deleted. ${result.message}`)
		refreshMediaLibrary()
		return succeeded(`Asset deleted from the library.${result.orphan ? ` ${orphanNote(result.orphan)}` : ' Its file was removed from Storage.'}`)
	})
}

function orphanNote(orphan: MediaOrphan) {
	return `A file${orphan.path ? ` (${orphan.path})` : ''} could not be removed from Storage (${orphan.reason}). “Check Storage” lists it as orphaned.`
}

export type StorageCheck = MediaStorageDrift & { checkedAt: string }

/**
 * Compares Storage with the library (read-only): files no asset points to
 * (orphans, left by an interrupted replace or delete) and assets whose file
 * is missing. Uses the staff session; the bucket's staff select policy
 * allows listing.
 */
export async function checkMediaStorageAction(): Promise<AdminActionResult<StorageCheck>> {
	return adminAction('Could not check Storage.', async () => {
		await requireActiveStaff()
		const supabase = await createClient()
		const drift = await findMediaStorageDrift(supabase, { bucket: MEDIA_BUCKET })
		const summary = `${drift.files} file${drift.files === 1 ? '' : 's'} in Storage and ${drift.records} in the library: ${drift.orphans.length} orphaned, ${drift.missing.length} missing.`
		return succeeded(summary, { ...drift, checkedAt: new Date().toISOString() })
	})
}
