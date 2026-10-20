'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, failed, FieldError, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_CATALOGUE_CACHE_TAG, PUBLIC_GLOBAL_CACHE_TAG, PUBLIC_NEWSROOM_CACHE_TAG, PUBLIC_OUTREACH_CACHE_TAG, PUBLIC_TEAM_CACHE_TAG } from '@/lib/cache-tags'
import { MEDIA_BUCKET, mediaObjectPath, validateMediaFile } from '@/lib/media-library'
import { mediaReferencesByAssetId } from '@/lib/media-references'
import { createClient } from '@/lib/supabase/server'

const localeSchema = z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, 'Choose a valid locale.')
const assetIdSchema = z.string().uuid('Choose a valid media asset.')
const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null)

// The file checks in validateMediaFile describe the chosen file.
async function fileField<T>(validate: () => Promise<T>) {
	try {
		return await validate()
	} catch (error) {
		throw new FieldError('file', error instanceof Error ? error.message : 'This file cannot be used.')
	}
}

function refreshMediaLibrary() {
	revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_GLOBAL_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_NEWSROOM_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_OUTREACH_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_TEAM_CACHE_TAG, 'max')
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

export async function uploadMediaAssetAction(formData: FormData): Promise<AdminActionResult<{ assetId: string }>> {
	return adminAction('Could not upload the media asset.', async () => {
		const file = formData.get('file')
		if (!(file instanceof File) || !file.size) throw new FieldError('file', 'Choose a file to upload.')
		const altText = optionalText(320).parse(formData.get('altText') ?? '')
		const caption = optionalText(2_000).parse(formData.get('caption') ?? '')
		const { profile } = await requireActiveStaff()
		const media = await fileField(() => validateMediaFile(file))
		const path = mediaObjectPath(media.extension)
		const supabase = await createClient()
		const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, media.bytes, {
			cacheControl: '31536000', contentType: media.mimeType, upsert: false,
		})
		if (uploadError) return failed(`Could not upload the file: ${uploadError.message}`)
		const { data: asset, error: assetError } = await supabase.from('media_assets').insert({
			bucket_id: MEDIA_BUCKET, object_path: path, original_filename: media.originalFilename,
			mime_type: media.mimeType, file_size_bytes: media.fileSizeBytes, width: media.width,
			height: media.height, uploaded_by: profile.id,
		}).select('id').single()
		if (assetError) {
			await supabase.storage.from(MEDIA_BUCKET).remove([path])
			return failed(`The file was uploaded but its media record could not be created: ${assetError.message}`)
		}
		if (altText || caption) {
			const { error: translationError } = await supabase.from('media_asset_translations').insert({ media_asset_id: asset.id, locale: 'en', alt_text: altText ?? '', caption })
			if (translationError) return failed(`The file is in the library, but its English metadata could not be saved: ${translationError.message}`)
		}
		refreshMediaLibrary()
		return succeeded('Media uploaded to the library.', { assetId: asset.id })
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
		const parsed = z.object({ assetId: assetIdSchema, locale: localeSchema, altText: optionalText(320), caption: optionalText(2_000) }).parse({ assetId: formData.get('assetId'), locale: formData.get('locale'), altText: formData.get('altText') ?? '', caption: formData.get('caption') ?? '' })
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
	return adminAction('Could not replace the media asset.', async () => {
		const assetId = assetIdSchema.parse(formData.get('assetId'))
		const file = formData.get('file')
		if (!(file instanceof File) || !file.size) throw new FieldError('file', 'Choose a replacement file.')
		await requireActiveStaff()
		const media = await fileField(() => validateMediaFile(file))
		const path = mediaObjectPath(media.extension)
		const supabase = await createClient()
		const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, media.bytes, { cacheControl: '31536000', contentType: media.mimeType, upsert: false })
		if (uploadError) return failed(`Could not upload the replacement file: ${uploadError.message}`)
		const { error: replaceError } = await supabase.rpc('replace_media_asset', {
			p_media_asset_id: assetId, p_object_path: path, p_original_filename: media.originalFilename,
			p_mime_type: media.mimeType, p_file_size_bytes: media.fileSizeBytes, p_width: media.width, p_height: media.height,
		})
		if (replaceError) {
			await supabase.storage.from(MEDIA_BUCKET).remove([path])
			return failed(`The replacement could not be applied: ${replaceError.message}`)
		}
		refreshMediaLibrary()
		return succeeded('File replaced. Existing CMS references continue to use this media asset.')
	})
}

export async function deleteMediaAssetAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not delete the media asset.', async () => {
		const assetId = assetIdSchema.parse(formData.get('assetId'))
		await requireActiveStaff()
		const references = await mediaReferencesByAssetId([assetId])
		const assetReferences = references.get(assetId) ?? []
		if (assetReferences.length) return failed(`This asset is in use by ${assetReferences.map((reference) => `${reference.type.toLowerCase()} “${reference.label}”`).join(', ')}. Remove or replace those references before deleting it.`)
		const supabase = await createClient()
		const { error } = await supabase.rpc('delete_media_asset', { p_media_asset_id: assetId })
		if (error) return failed(`Could not delete the media asset: ${error.message}`)
		refreshMediaLibrary()
		return succeeded('Unreferenced media asset deleted from Storage and the library.')
	})
}
