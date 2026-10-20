'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, failed, FieldError, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { PUBLICATION_COLUMNS, publicationColumns, publishedNotice, type SavedPublication } from '@/lib/admin-publication'
import { optionalHttpUrl, optionalText, optionalUuid, requiredKey } from '@/lib/admin-schema.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { libraryAltText, requireImageAsset, requireLibraryAlt } from '@/lib/media-choices'
import { PUBLIC_GLOBAL_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
const statuses = ['draft', 'scheduled', 'published', 'archived'] as const
const entityKinds = ['partners', 'endorsements'] as const
const stableKey = requiredKey

const partnerDetailsSchema = z.object({
	partnerId: optionalUuid,
	stableKey,
	name: z.string().trim().min(2).max(200),
	websiteUrl: optionalHttpUrl('Enter a complete http or https website URL.'),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	logoMediaId: optionalUuid,
})

const partnerTranslationSchema = z.object({
	partnerId: optionalUuid, locale: z.enum(locales), altText: optionalText(320),
	description: optionalText(2_000), status: z.enum(statuses),
})

const endorsementDetailsSchema = z.object({
	endorsementId: optionalUuid, stableKey,
	attributionName: z.string().trim().min(2).max(200), partnerId: optionalUuid,
	portraitMediaId: optionalUuid,
	displayOrder: z.coerce.number().int().min(0).max(100_000),
})

const endorsementTranslationSchema = z.object({
	endorsementId: optionalUuid, locale: z.enum(locales),
	quote: z.string().trim().min(3).max(5_000), attributionTitle: optionalText(320),
	status: z.enum(statuses),
})

export type PartnerEntityKind = (typeof entityKinds)[number]

function partnerDetails(formData: FormData, includeId = true) {
	return partnerDetailsSchema.parse({
		partnerId: includeId ? formData.get('partnerId') : undefined,
		stableKey: formData.get('stableKey'), name: formData.get('name'), websiteUrl: formData.get('websiteUrl'),
		displayOrder: formData.get('displayOrder'), logoMediaId: formData.get('logoMediaId'),
	})
}

function partnerTranslation(formData: FormData, includeId = true) {
	const parsed = partnerTranslationSchema.parse({
		partnerId: includeId ? formData.get('partnerId') : undefined, locale: formData.get('locale'),
		altText: formData.get('altText'), description: formData.get('description'),
		status: formData.get('status'),
	})
	return { ...parsed, publishAt: formData.get('publishAt') }
}

function endorsementDetails(formData: FormData, includeId = true) {
	return endorsementDetailsSchema.parse({
		endorsementId: includeId ? formData.get('endorsementId') : undefined,
		stableKey: formData.get('stableKey'), attributionName: formData.get('attributionName'),
		partnerId: formData.get('partnerId'), portraitMediaId: formData.get('portraitMediaId'),
		displayOrder: formData.get('displayOrder'),
	})
}

function endorsementTranslation(formData: FormData, includeId = true) {
	const parsed = endorsementTranslationSchema.parse({
		endorsementId: includeId ? formData.get('endorsementId') : undefined, locale: formData.get('locale'),
		quote: formData.get('quote'), attributionTitle: formData.get('attributionTitle'),
		status: formData.get('status'),
	})
	return { ...parsed, publishAt: formData.get('publishAt') }
}

// A published partner shows its logo with its own alt text for this locale
// (partner_translations.alt_text, written only by this partner's form), or
// else the logo's alt text in the Media library (audit X-09). One of them
// must exist.
async function requireLogoAlt(supabase: Awaited<ReturnType<typeof createClient>>, mediaId: string, locale: (typeof locales)[number], ownAltText: string | null) {
	if (ownAltText || await libraryAltText(supabase, mediaId, locale)) return
	throw new FieldError('altText', `Published content needs alt text for the logo: enter it here, or add ${locale} alt text to the logo in the Media library.`)
}

function refreshPartners() {
	updateTag(PUBLIC_GLOBAL_CACHE_TAG)
	revalidatePath('/admin')
	revalidatePath('/admin/partners')
	revalidatePath('/[locale]', 'page')
}

export async function createPartnerAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the partner.', async () => {
		const details = partnerDetails(formData, false); const translation = partnerTranslation(formData, false)
		if (translation.locale !== 'en') return failed('New partner records must start with English content.')
		const { goesPublic, row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && !details.logoMediaId) throw new FieldError('logoMediaId', 'Published partner content needs a logo.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await requireImageAsset(supabase, details.logoMediaId, 'logoMediaId', 'logo')
		if (goesPublic && details.logoMediaId) await requireLogoAlt(supabase, details.logoMediaId, 'en', translation.altText)
		const id = randomUUID()
		const { error: recordError } = await supabase.from('partners').insert({ id, stable_key: details.stableKey, name: details.name, website_url: details.websiteUrl, display_order: details.displayOrder, logo_media_id: details.logoMediaId, created_by: profile.id, updated_by: profile.id })
		if (recordError) return failed(`Could not create the partner: ${recordError.message}`)
		const { error: translationError } = await supabase.from('partner_translations').insert({ partner_id: id, locale: 'en', alt_text: translation.altText ?? '', description: translation.description, ...publication })
		if (translationError) return failed(`The partner was created, but its English content could not be saved: ${translationError.message}`)
		refreshPartners(); return succeeded('Partner created.', undefined, { redirectTo: `/admin/partners/partners/${id}` })
	})
}

export async function savePartnerDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save partner details.', async () => {
		const details = partnerDetails(formData); if (!details.partnerId) return failed('Invalid partner.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await requireImageAsset(supabase, details.logoMediaId, 'logoMediaId', 'logo')
		const { error } = await supabase.from('partners').update({ stable_key: details.stableKey, name: details.name, website_url: details.websiteUrl, display_order: details.displayOrder, logo_media_id: details.logoMediaId, updated_by: profile.id }).eq('id', details.partnerId)
		if (error) return failed(`Could not save partner details: ${error.message}`)
		refreshPartners(); revalidatePath(`/admin/partners/partners/${details.partnerId}`); return succeeded('Partner details saved.')
	})
}

export async function savePartnerTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save partner content.', async () => {
		const translation = partnerTranslation(formData); if (!translation.partnerId) return failed('Invalid partner.')
		await requireActiveStaff(); const supabase = await createClient()
		const { data: partner, error: partnerError } = await supabase.from('partners').select('logo_media_id').eq('id', translation.partnerId).maybeSingle()
		if (partnerError || !partner) return failed(`Could not load the partner: ${partnerError?.message ?? 'Partner not found.'}`)
		const { data: existing, error: existingError } = await supabase.from('partner_translations').select(PUBLICATION_COLUMNS).eq('partner_id', translation.partnerId).eq('locale', translation.locale).maybeSingle()
		if (existingError) return failed(`Could not load the partner content: ${existingError.message}`)
		const { goesPublic, row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && !partner.logo_media_id) throw new FieldError('status', 'Published partner content needs a logo. Select one in the shared details first.')
		if (goesPublic && partner.logo_media_id) await requireLogoAlt(supabase, partner.logo_media_id, translation.locale, translation.altText)
		const { error } = await supabase.from('partner_translations').upsert({ partner_id: translation.partnerId, locale: translation.locale, alt_text: translation.altText ?? '', description: translation.description, ...publication }, { onConflict: 'partner_id,locale' })
		if (error) return failed(`Could not save partner content: ${error.message}`)
		refreshPartners(); revalidatePath(`/admin/partners/partners/${translation.partnerId}`); return succeeded(`${translation.locale} partner content saved${publishedNotice(saved)}.`, saved)
	})
}

export async function createEndorsementAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the endorsement.', async () => {
		const details = endorsementDetails(formData, false); const translation = endorsementTranslation(formData, false)
		if (translation.locale !== 'en') return failed('New endorsements must start with English content.')
		const { goesPublic, row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await requireImageAsset(supabase, details.portraitMediaId, 'portraitMediaId', 'portrait')
		if (goesPublic && details.portraitMediaId) await requireLibraryAlt(supabase, { field: 'portraitAlt', label: 'portrait', locale: 'en', mediaId: details.portraitMediaId })
		const id = randomUUID()
		const { error: recordError } = await supabase.from('endorsements').insert({ id, stable_key: details.stableKey, partner_id: details.partnerId, portrait_media_id: details.portraitMediaId, attribution_name: details.attributionName, display_order: details.displayOrder, created_by: profile.id, updated_by: profile.id })
		if (recordError) return failed(`Could not create the endorsement: ${recordError.message}`)
		const { error: translationError } = await supabase.from('endorsement_translations').insert({ endorsement_id: id, locale: 'en', quote: translation.quote, attribution_title: translation.attributionTitle, ...publication })
		if (translationError) return failed(`The endorsement was created, but its English content could not be saved: ${translationError.message}`)
		refreshPartners(); return succeeded('Endorsement created.', undefined, { redirectTo: `/admin/partners/endorsements/${id}` })
	})
}

export async function saveEndorsementDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save endorsement details.', async () => {
		const details = endorsementDetails(formData); if (!details.endorsementId) return failed('Invalid endorsement.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await requireImageAsset(supabase, details.portraitMediaId, 'portraitMediaId', 'portrait')
		const { error } = await supabase.from('endorsements').update({ stable_key: details.stableKey, partner_id: details.partnerId, portrait_media_id: details.portraitMediaId, attribution_name: details.attributionName, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.endorsementId)
		if (error) return failed(`Could not save endorsement details: ${error.message}`)
		refreshPartners(); revalidatePath(`/admin/partners/endorsements/${details.endorsementId}`); return succeeded('Endorsement details saved.')
	})
}

export async function saveEndorsementTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save endorsement content.', async () => {
		const translation = endorsementTranslation(formData); if (!translation.endorsementId) return failed('Invalid endorsement.')
		await requireActiveStaff(); const supabase = await createClient()
		const { data: endorsement, error: endorsementError } = await supabase.from('endorsements').select('portrait_media_id').eq('id', translation.endorsementId).maybeSingle()
		if (endorsementError || !endorsement) return failed(`Could not load the endorsement: ${endorsementError?.message ?? 'Endorsement not found.'}`)
		const { data: existing, error: existingError } = await supabase.from('endorsement_translations').select(PUBLICATION_COLUMNS).eq('endorsement_id', translation.endorsementId).eq('locale', translation.locale).maybeSingle()
		if (existingError) return failed(`Could not load the endorsement content: ${existingError.message}`)
		const { goesPublic, row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && endorsement.portrait_media_id) await requireLibraryAlt(supabase, { field: 'portraitAlt', label: 'portrait', locale: translation.locale, mediaId: endorsement.portrait_media_id })
		const { error } = await supabase.from('endorsement_translations').upsert({ endorsement_id: translation.endorsementId, locale: translation.locale, quote: translation.quote, attribution_title: translation.attributionTitle, ...publication }, { onConflict: 'endorsement_id,locale' })
		if (error) return failed(`Could not save endorsement content: ${error.message}`)
		refreshPartners(); revalidatePath(`/admin/partners/endorsements/${translation.endorsementId}`); return succeeded(`${translation.locale} endorsement content saved${publishedNotice(saved)}.`, saved)
	})
}

export async function setPartnerEntityArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update the record.', async () => {
		const kind = z.enum(entityKinds).parse(formData.get('kind')); const entryId = z.string().uuid().parse(formData.get('entryId'))
		const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from(kind).update({ is_active: !archive, updated_by: profile.id }).eq('id', entryId)
		if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} the record: ${error.message}`)
		refreshPartners(); revalidatePath(`/admin/partners/${kind}/${entryId}`); return succeeded(archive ? 'Record archived.' : 'Record restored.')
	})
}

export async function movePartnerEntityAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update the ordering.', async () => {
		const kind = z.enum(entityKinds).parse(formData.get('kind')); const entryId = z.string().uuid().parse(formData.get('entryId'))
		const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const orderField = kind === 'partners' ? 'name' : 'attribution_name'
		const { data, error } = await supabase.from(kind).select('id').eq('is_active', true).order('display_order').order(orderField)
		if (error) return failed(`Could not load the ordering: ${error.message}`)
		const ids = (data ?? []).map((item) => item.id); const current = ids.indexOf(entryId); const destination = current + (direction === 'up' ? -1 : 1)
		if (current < 0 || destination < 0 || destination >= ids.length) return succeeded('Order is unchanged.')
		;[ids[current], ids[destination]] = [ids[destination], ids[current]]
		const updates = await Promise.all(ids.map((id, displayOrder) => supabase.from(kind).update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
		const failedUpdate = updates.find((result) => result.error)
		if (failedUpdate?.error) return failed(`Could not save the ordering: ${failedUpdate.error.message}`)
		refreshPartners(); return succeeded('Order saved.')
	})
}
