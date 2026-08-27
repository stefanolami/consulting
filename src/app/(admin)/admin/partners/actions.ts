'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
const statuses = ['draft', 'scheduled', 'published', 'archived'] as const
const entityKinds = ['partners', 'endorsements'] as const
const stableKey = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')
const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || null)
const optionalUuid = z.string().uuid().optional().transform((value) => value || null)
const httpUrl = z.string().trim().max(2_048).superRefine((value, context) => {
	try {
		const protocol = new URL(value).protocol
		if (protocol !== 'http:' && protocol !== 'https:') context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' })
	} catch { context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' }) }
})

const partnerDetailsSchema = z.object({
	partnerId: z.string().uuid().optional(),
	stableKey,
	name: z.string().trim().min(2).max(200),
	websiteUrl: optionalText(2_048).refine((value) => value === null || httpUrl.safeParse(value).success, 'Enter a complete http or https website URL.'),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	logoMediaId: optionalUuid,
	englishAltText: optionalText(320),
})

const partnerTranslationSchema = z.object({
	partnerId: z.string().uuid().optional(), locale: z.enum(locales), altText: optionalText(320),
	description: optionalText(2_000), status: z.enum(statuses), scheduledFor: optionalText(64),
})

const endorsementDetailsSchema = z.object({
	endorsementId: z.string().uuid().optional(), stableKey,
	attributionName: z.string().trim().min(2).max(200), partnerId: optionalUuid,
	portraitMediaId: optionalUuid, portraitAltText: optionalText(320),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
})

const endorsementTranslationSchema = z.object({
	endorsementId: z.string().uuid().optional(), locale: z.enum(locales),
	quote: z.string().trim().min(3).max(5_000), attributionTitle: optionalText(320),
	portraitAltText: optionalText(320), status: z.enum(statuses), scheduledFor: optionalText(64),
})

export type PartnerActionState = { error?: string; success?: string; entryId?: string }
export type PartnerEntityKind = (typeof entityKinds)[number]

function publication(status: (typeof statuses)[number], scheduledFor: string | null) {
	if (status === 'scheduled' && !scheduledFor) throw new Error('Choose a scheduled publication time.')
	const scheduled = scheduledFor ? new Date(scheduledFor) : null
	if (scheduled && Number.isNaN(scheduled.getTime())) throw new Error('Choose a valid scheduled publication time.')
	return {
		status,
		scheduled_for: status === 'scheduled' ? scheduled!.toISOString() : null,
		published_at: status === 'published' ? new Date().toISOString() : null,
	}
}

function partnerDetails(formData: FormData, includeId = true) {
	return partnerDetailsSchema.parse({
		partnerId: includeId ? formData.get('partnerId') || undefined : undefined,
		stableKey: formData.get('stableKey'), name: formData.get('name'), websiteUrl: formData.get('websiteUrl') || undefined,
		displayOrder: formData.get('displayOrder'), logoMediaId: formData.get('logoMediaId') || undefined,
		englishAltText: formData.get('englishAltText') || undefined,
	})
}

function partnerTranslation(formData: FormData, includeId = true) {
	const parsed = partnerTranslationSchema.parse({
		partnerId: includeId ? formData.get('partnerId') || undefined : undefined, locale: formData.get('locale'),
		altText: formData.get('altText') || undefined, description: formData.get('description') || undefined,
		status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined,
	})
	return { ...parsed, ...publication(parsed.status, parsed.scheduledFor) }
}

function endorsementDetails(formData: FormData, includeId = true) {
	return endorsementDetailsSchema.parse({
		endorsementId: includeId ? formData.get('endorsementId') || undefined : undefined,
		stableKey: formData.get('stableKey'), attributionName: formData.get('attributionName'),
		partnerId: formData.get('partnerId') || undefined, portraitMediaId: formData.get('portraitMediaId') || undefined,
		portraitAltText: formData.get('portraitAltText') || undefined, displayOrder: formData.get('displayOrder'),
	})
}

function endorsementTranslation(formData: FormData, includeId = true) {
	const parsed = endorsementTranslationSchema.parse({
		endorsementId: includeId ? formData.get('endorsementId') || undefined : undefined, locale: formData.get('locale'),
		quote: formData.get('quote'), attributionTitle: formData.get('attributionTitle') || undefined,
		portraitAltText: formData.get('portraitAltText') || undefined, status: formData.get('status'),
		scheduledFor: formData.get('scheduledFor') || undefined,
	})
	return { ...parsed, ...publication(parsed.status, parsed.scheduledFor) }
}

async function validateImage(supabase: Awaited<ReturnType<typeof createClient>>, mediaId: string | null, label: string) {
	if (!mediaId) return
	const { data, error } = await supabase.from('media_assets').select('mime_type').eq('id', mediaId).maybeSingle()
	if (error || !data) throw new Error(`Could not validate the selected ${label}: ${error?.message ?? 'Media asset not found.'}`)
	if (!data.mime_type?.startsWith('image/')) throw new Error(`Choose an image from the media library for the ${label}.`)
}

async function saveMediaAlt(supabase: Awaited<ReturnType<typeof createClient>>, mediaId: string, locale: (typeof locales)[number], altText: string) {
	const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: mediaId, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' })
	if (error) throw new Error(`Could not save media alt text: ${error.message}`)
}

function refreshPartners() {
	revalidatePath('/admin')
	revalidatePath('/admin/partners')
}

export async function createPartnerAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const details = partnerDetails(formData, false); const translation = partnerTranslation(formData, false)
		if (translation.locale !== 'en') return { error: 'New partner records must start with English content.' }
		if (details.logoMediaId && !translation.altText) return { error: 'A selected logo needs English alt text.' }
		if (translation.status === 'published' && !details.logoMediaId) return { error: 'Published partner content needs a logo.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await validateImage(supabase, details.logoMediaId, 'logo')
		const id = randomUUID()
		const { error: recordError } = await supabase.from('partners').insert({ id, stable_key: details.stableKey, name: details.name, website_url: details.websiteUrl, display_order: details.displayOrder, logo_media_id: details.logoMediaId, created_by: profile.id, updated_by: profile.id })
		if (recordError) return { error: `Could not create the partner: ${recordError.message}` }
		const { error: translationError } = await supabase.from('partner_translations').insert({ partner_id: id, locale: 'en', alt_text: translation.altText ?? '', description: translation.description, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at })
		if (translationError) return { error: `The partner was created, but its English content could not be saved: ${translationError.message}` }
		if (details.logoMediaId && translation.altText) await saveMediaAlt(supabase, details.logoMediaId, 'en', translation.altText)
		refreshPartners(); return { success: 'Partner created.', entryId: id }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the partner.' } }
}

export async function savePartnerDetailsAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const details = partnerDetails(formData); if (!details.partnerId) return { error: 'Invalid partner.' }
		if (details.logoMediaId && !details.englishAltText) return { error: 'A selected logo needs English alt text.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await validateImage(supabase, details.logoMediaId, 'logo')
		const { error } = await supabase.from('partners').update({ stable_key: details.stableKey, name: details.name, website_url: details.websiteUrl, display_order: details.displayOrder, logo_media_id: details.logoMediaId, updated_by: profile.id }).eq('id', details.partnerId)
		if (error) return { error: `Could not save partner details: ${error.message}` }
		if (details.logoMediaId && details.englishAltText) {
			const { error: altError } = await supabase.from('partner_translations').update({ alt_text: details.englishAltText }).eq('partner_id', details.partnerId).eq('locale', 'en')
			if (altError) return { error: `Partner details were saved, but English alt text was not: ${altError.message}` }
			await saveMediaAlt(supabase, details.logoMediaId, 'en', details.englishAltText)
		}
		refreshPartners(); revalidatePath(`/admin/partners/partners/${details.partnerId}`); return { success: 'Partner details saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save partner details.' } }
}

export async function savePartnerTranslationAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const translation = partnerTranslation(formData); if (!translation.partnerId) return { error: 'Invalid partner.' }
		await requireActiveStaff(); const supabase = await createClient()
		const { data: partner, error: partnerError } = await supabase.from('partners').select('logo_media_id').eq('id', translation.partnerId).maybeSingle()
		if (partnerError || !partner) return { error: `Could not load the partner: ${partnerError?.message ?? 'Partner not found.'}` }
		if (partner.logo_media_id && !translation.altText) return { error: 'The selected logo needs localized alt text.' }
		if (translation.status === 'published' && !partner.logo_media_id) return { error: 'Published partner content needs a logo.' }
		const { error } = await supabase.from('partner_translations').upsert({ partner_id: translation.partnerId, locale: translation.locale, alt_text: translation.altText ?? '', description: translation.description, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }, { onConflict: 'partner_id,locale' })
		if (error) return { error: `Could not save partner content: ${error.message}` }
		if (partner.logo_media_id && translation.altText) await saveMediaAlt(supabase, partner.logo_media_id, translation.locale, translation.altText)
		refreshPartners(); revalidatePath(`/admin/partners/partners/${translation.partnerId}`); return { success: `${translation.locale} partner content saved.` }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save partner content.' } }
}

export async function createEndorsementAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const details = endorsementDetails(formData, false); const translation = endorsementTranslation(formData, false)
		if (translation.locale !== 'en') return { error: 'New endorsements must start with English content.' }
		if (details.portraitMediaId && !translation.portraitAltText) return { error: 'A selected portrait needs English alt text.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await validateImage(supabase, details.portraitMediaId, 'portrait')
		const id = randomUUID()
		const { error: recordError } = await supabase.from('endorsements').insert({ id, stable_key: details.stableKey, partner_id: details.partnerId, portrait_media_id: details.portraitMediaId, attribution_name: details.attributionName, display_order: details.displayOrder, created_by: profile.id, updated_by: profile.id })
		if (recordError) return { error: `Could not create the endorsement: ${recordError.message}` }
		const { error: translationError } = await supabase.from('endorsement_translations').insert({ endorsement_id: id, locale: 'en', quote: translation.quote, attribution_title: translation.attributionTitle, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at })
		if (translationError) return { error: `The endorsement was created, but its English content could not be saved: ${translationError.message}` }
		if (details.portraitMediaId && translation.portraitAltText) await saveMediaAlt(supabase, details.portraitMediaId, 'en', translation.portraitAltText)
		refreshPartners(); return { success: 'Endorsement created.', entryId: id }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the endorsement.' } }
}

export async function saveEndorsementDetailsAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const details = endorsementDetails(formData); if (!details.endorsementId) return { error: 'Invalid endorsement.' }
		if (details.portraitMediaId && !details.portraitAltText) return { error: 'A selected portrait needs English alt text.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); await validateImage(supabase, details.portraitMediaId, 'portrait')
		const { error } = await supabase.from('endorsements').update({ stable_key: details.stableKey, partner_id: details.partnerId, portrait_media_id: details.portraitMediaId, attribution_name: details.attributionName, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.endorsementId)
		if (error) return { error: `Could not save endorsement details: ${error.message}` }
		if (details.portraitMediaId && details.portraitAltText) await saveMediaAlt(supabase, details.portraitMediaId, 'en', details.portraitAltText)
		refreshPartners(); revalidatePath(`/admin/partners/endorsements/${details.endorsementId}`); return { success: 'Endorsement details saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save endorsement details.' } }
}

export async function saveEndorsementTranslationAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const translation = endorsementTranslation(formData); if (!translation.endorsementId) return { error: 'Invalid endorsement.' }
		await requireActiveStaff(); const supabase = await createClient()
		const { data: endorsement, error: endorsementError } = await supabase.from('endorsements').select('portrait_media_id').eq('id', translation.endorsementId).maybeSingle()
		if (endorsementError || !endorsement) return { error: `Could not load the endorsement: ${endorsementError?.message ?? 'Endorsement not found.'}` }
		if (endorsement.portrait_media_id && !translation.portraitAltText) return { error: 'The selected portrait needs localized alt text.' }
		const { error } = await supabase.from('endorsement_translations').upsert({ endorsement_id: translation.endorsementId, locale: translation.locale, quote: translation.quote, attribution_title: translation.attributionTitle, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }, { onConflict: 'endorsement_id,locale' })
		if (error) return { error: `Could not save endorsement content: ${error.message}` }
		if (endorsement.portrait_media_id && translation.portraitAltText) await saveMediaAlt(supabase, endorsement.portrait_media_id, translation.locale, translation.portraitAltText)
		refreshPartners(); revalidatePath(`/admin/partners/endorsements/${translation.endorsementId}`); return { success: `${translation.locale} endorsement content saved.` }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save endorsement content.' } }
}

export async function setPartnerEntityArchivedAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const kind = z.enum(entityKinds).parse(formData.get('kind')); const entryId = z.string().uuid().parse(formData.get('entryId'))
		const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from(kind).update({ is_active: !archive, updated_by: profile.id }).eq('id', entryId)
		if (error) return { error: `Could not ${archive ? 'archive' : 'restore'} the record: ${error.message}` }
		refreshPartners(); revalidatePath(`/admin/partners/${kind}/${entryId}`); return { success: archive ? 'Record archived.' : 'Record restored.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update the record.' } }
}

export async function movePartnerEntityAction(_: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
	try {
		const kind = z.enum(entityKinds).parse(formData.get('kind')); const entryId = z.string().uuid().parse(formData.get('entryId'))
		const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const orderField = kind === 'partners' ? 'name' : 'attribution_name'
		const { data, error } = await supabase.from(kind).select('id').eq('is_active', true).order('display_order').order(orderField)
		if (error) return { error: `Could not load the ordering: ${error.message}` }
		const ids = (data ?? []).map((item) => item.id); const current = ids.indexOf(entryId); const destination = current + (direction === 'up' ? -1 : 1)
		if (current < 0 || destination < 0 || destination >= ids.length) return { success: 'Order is unchanged.' }
		;[ids[current], ids[destination]] = [ids[destination], ids[current]]
		const updates = await Promise.all(ids.map((id, displayOrder) => supabase.from(kind).update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
		const failed = updates.find((result) => result.error)
		if (failed?.error) return { error: `Could not save the ordering: ${failed.error.message}` }
		refreshPartners(); return { success: 'Order saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update the ordering.' } }
}
