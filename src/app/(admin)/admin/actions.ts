'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { parseProfileDocument } from '@/lib/team-profile-document'
import { parseCatalogueDocument } from '@/lib/catalogue-document'
import { articleImageMediaIds, parseArticleDocument } from '@/lib/article-document'
import { PUBLIC_CATALOGUE_CACHE_TAG, PUBLIC_NEWSROOM_CACHE_TAG, PUBLIC_OUTREACH_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || null)
const requiredKey = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')

const sharedProfileSchema = z.object({
	displayName: z.string().trim().min(2).max(160),
	stableKey: requiredKey,
	email: optionalText(320).refine((value) => value === null || z.string().email().safeParse(value).success, 'Enter a valid email address.'),
	phone: optionalText(80),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	teamGroup: z.enum(['managing_team', 'team']),
})

const profileRoleSchema = z.object({
	id: z.string().uuid().optional(),
	title: z.string().trim().min(1).max(160),
	cardLabel: optionalText(100),
	isCardRole: z.boolean(),
})

const translationSchema = z.object({
	personId: z.string().uuid(),
	locale: z.enum(locales),
	slug: requiredKey,
	cardName: optionalText(160),
	roles: z.array(profileRoleSchema).min(1).max(10),
	profileDocument: z.unknown(),
	portraitAltText: optionalText(320),
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(['draft', 'published', 'archived']),
})

const portraitSchema = z.object({
	personId: z.string().uuid(),
	objectPath: z.string().min(1).max(1024),
	originalFilename: z.string().min(1).max(512),
	mimeType: z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
	fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	altText: z.string().trim().min(3).max(320),
})

function parseJsonField(value: FormDataEntryValue | null, field: string): unknown {
	if (typeof value !== 'string' || !value) throw new Error(`${field} is required.`)
	try {
		return JSON.parse(value)
	} catch {
		throw new Error(`${field} is not valid.`)
	}
}

function parseRoles(value: unknown) {
	const roles = z.array(profileRoleSchema).min(1).max(10).safeParse(value)
	if (!roles.success) throw new Error(roles.error.issues[0]?.message ?? 'Enter at least one valid role.')
	if (roles.data.filter((role) => role.isCardRole).length !== 1) throw new Error('Select exactly one role for the team card.')
	return roles.data.map((role, displayOrder) => ({ ...role, displayOrder }))
}

async function replaceRoles(
	supabase: Awaited<ReturnType<typeof createClient>>,
	personId: string,
	locale: (typeof locales)[number],
	roles: ReturnType<typeof parseRoles>,
) {
	const { error: deleteError } = await supabase
		.from('people_profile_roles')
		.delete()
		.eq('person_id', personId)
		.eq('locale', locale)
	if (deleteError) throw new Error(`Could not update profile roles: ${deleteError.message}`)

	const { error: insertError } = await supabase.from('people_profile_roles').insert(
		roles.map((role) => ({
			id: role.id ?? randomUUID(),
			person_id: personId,
			locale,
			title: role.title,
			card_label: role.cardLabel,
			display_order: role.displayOrder,
			is_card_role: role.isCardRole,
		})),
	)
	if (insertError) throw new Error(`Could not save profile roles: ${insertError.message}`)
}

export async function signOutAction() {
	const supabase = await createClient()
	await supabase.auth.signOut()
	redirect('/auth/sign-in')
}

export async function createPersonAction(formData: FormData) {
	const shared = sharedProfileSchema.safeParse({
		displayName: formData.get('displayName'), stableKey: formData.get('stableKey'),
		email: formData.get('email') || undefined, phone: formData.get('phone') || undefined,
		displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'),
	})
	const english = z.object({
		slug: requiredKey, cardName: optionalText(160), roles: z.unknown(), profileDocument: z.unknown(),
		portraitAltText: optionalText(320), seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(['draft', 'published']),
	}).safeParse({
		slug: formData.get('slug'), cardName: formData.get('cardName') || undefined,
		roles: parseJsonField(formData.get('roles'), 'Roles'), profileDocument: parseJsonField(formData.get('profileDocument'), 'Profile document'),
		portraitAltText: formData.get('portraitAltText') || undefined, seoTitle: formData.get('seoTitle') || undefined,
		seoDescription: formData.get('seoDescription') || undefined, status: formData.get('status'),
	})
	if (!shared.success || !english.success) throw new Error(shared.error?.issues[0]?.message ?? english.error?.issues[0]?.message ?? 'Enter a valid profile.')
	const roles = parseRoles(english.data.roles)
	let profileDocument
	try { profileDocument = parseProfileDocument(english.data.profileDocument) } catch (error) { throw new Error(error instanceof Error ? error.message : 'Enter a valid profile document.') }

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: existingSlug, error: slugError } = await supabase.from('people_translations').select('person_id').eq('locale', 'en').eq('slug', english.data.slug).maybeSingle()
	if (slugError) throw new Error(`Could not validate the English URL slug: ${slugError.message}`)
	if (existingSlug) throw new Error('That English URL slug is already in use.')

	const personId = randomUUID()
	const portraitFile = formData.get('portraitFile')
	let portraitMediaId: string | null = null
	if (portraitFile instanceof File && portraitFile.size > 0) {
		const mimeType = z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']).safeParse(portraitFile.type)
		if (!mimeType.success) throw new Error('Choose a GIF, JPEG, PNG, SVG, or WebP portrait.')
		if (portraitFile.size > 15 * 1024 * 1024) throw new Error('Portraits must be 15 MiB or smaller.')
		if (!english.data.portraitAltText || english.data.portraitAltText.length < 3) throw new Error('Provide English alt text for the portrait.')
		const extension = mimeType.data === 'image/jpeg' ? 'jpg' : mimeType.data.split('/')[1]
		const objectPath = `people/${personId}/${randomUUID()}.${extension}`
		const { error: uploadError } = await supabase.storage.from('public-media').upload(objectPath, await portraitFile.arrayBuffer(), { cacheControl: '31536000', contentType: mimeType.data, upsert: false })
		if (uploadError) throw new Error(`Could not upload portrait: ${uploadError.message}`)
		const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: objectPath, original_filename: portraitFile.name, mime_type: mimeType.data, file_size_bytes: portraitFile.size, uploaded_by: profile.id }).select('id').single()
		if (mediaError) throw new Error(`The portrait uploaded, but its media record could not be created: ${mediaError.message}`)
		const { error: altError } = await supabase.from('media_asset_translations').insert({ media_asset_id: media.id, locale: 'en', alt_text: english.data.portraitAltText })
		if (altError) throw new Error(`The portrait uploaded, but its alt text could not be saved: ${altError.message}`)
		portraitMediaId = media.id
	}

	const { data: person, error: personError } = await supabase.from('people').insert({
		id: personId,
		display_name: shared.data.displayName, stable_key: shared.data.stableKey, email: shared.data.email, phone: shared.data.phone,
		display_order: shared.data.displayOrder, team_group: shared.data.teamGroup,
		portrait_media_id: portraitMediaId,
		is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on',
		created_by: profile.id, updated_by: profile.id,
	}).select('id').single()
	if (personError) throw new Error(`Could not create the profile: ${personError.message}`)

	const { error: translationError } = await supabase.from('people_translations').insert({
		person_id: person.id, locale: 'en', slug: english.data.slug, card_name: english.data.cardName,
		profile_document: profileDocument, seo_title: english.data.seoTitle,
		seo_description: english.data.seoDescription, status: english.data.status,
		published_at: english.data.status === 'published' ? new Date().toISOString() : null,
	})
	if (translationError) throw new Error(`The shared profile was created, but the English translation could not be saved: ${translationError.message}`)
	await replaceRoles(supabase, person.id, 'en', roles)

	revalidatePath('/admin')
	revalidatePath('/admin/people')
	redirect(`/admin/people/${person.id}`)
}

export async function updatePersonAction(formData: FormData) {
	const parsed = sharedProfileSchema.safeParse({
		displayName: formData.get('displayName'), stableKey: formData.get('stableKey'), email: formData.get('email') || undefined,
		phone: formData.get('phone') || undefined, displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'),
	})
	const personId = z.string().uuid().safeParse(formData.get('personId'))
	if (!parsed.success || !personId.success) throw new Error(parsed.error?.issues[0]?.message ?? 'Enter valid profile details.')
	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { error } = await supabase.from('people').update({
		display_name: parsed.data.displayName, stable_key: parsed.data.stableKey, email: parsed.data.email, phone: parsed.data.phone,
		display_order: parsed.data.displayOrder, team_group: parsed.data.teamGroup,
		is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on', updated_by: profile.id,
	}).eq('id', personId.data)
	if (error) throw new Error(`Could not save the profile: ${error.message}`)
	await refreshPersonPaths(supabase, personId.data)
}

export async function savePersonTranslationAction(formData: FormData) {
	const parsed = translationSchema.safeParse({
		personId: formData.get('personId'), locale: formData.get('locale'), slug: formData.get('slug'), cardName: formData.get('cardName') || undefined,
		roles: parseJsonField(formData.get('roles'), 'Roles'), profileDocument: parseJsonField(formData.get('profileDocument'), 'Profile document'),
		portraitAltText: formData.get('portraitAltText') || undefined, seoTitle: formData.get('seoTitle') || undefined,
		seoDescription: formData.get('seoDescription') || undefined, status: formData.get('status'),
	})
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Enter valid translation details.')
	const roles = parseRoles(parsed.data.roles)
	let profileDocument
	try { profileDocument = parseProfileDocument(parsed.data.profileDocument) } catch (error) { throw new Error(error instanceof Error ? error.message : 'Enter a valid profile document.') }

	await requireActiveStaff()
	const supabase = await createClient()
	const { error } = await supabase.from('people_translations').upsert({
		person_id: parsed.data.personId, locale: parsed.data.locale, slug: parsed.data.slug, card_name: parsed.data.cardName,
		profile_document: profileDocument, seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription,
		status: parsed.data.status, published_at: parsed.data.status === 'published' ? new Date().toISOString() : null, scheduled_for: null,
	}, { onConflict: 'person_id,locale' })
	if (error) throw new Error(`Could not save the translation: ${error.message}`)
	await replaceRoles(supabase, parsed.data.personId, parsed.data.locale, roles)

	if (parsed.data.portraitAltText) {
		const { data: person, error: portraitError } = await supabase.from('people').select('portrait_media_id').eq('id', parsed.data.personId).maybeSingle()
		if (portraitError) throw new Error(`Could not load portrait details: ${portraitError.message}`)
		if (person?.portrait_media_id) {
			const { error: altError } = await supabase.from('media_asset_translations').upsert({ media_asset_id: person.portrait_media_id, locale: parsed.data.locale, alt_text: parsed.data.portraitAltText }, { onConflict: 'media_asset_id,locale' })
			if (altError) throw new Error(`Could not save portrait alt text: ${altError.message}`)
		}
	}
	await refreshPersonPaths(supabase, parsed.data.personId)
}

export async function setPersonArchivedAction(formData: FormData) {
	const personId = z.string().uuid().safeParse(formData.get('personId'))
	const isArchived = formData.get('isArchived') === 'true'
	if (!personId.success) throw new Error('Invalid profile.')
	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { error } = await supabase.from('people').update({ is_active: !isArchived, updated_by: profile.id }).eq('id', personId.data)
	if (error) throw new Error(`Could not ${isArchived ? 'archive' : 'restore'} this profile: ${error.message}`)
	await refreshPersonPaths(supabase, personId.data)
}

export async function movePersonAction(formData: FormData) {
	const personId = z.string().uuid().safeParse(formData.get('personId'))
	const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'))
	if (!personId.success || !direction.success) throw new Error('Invalid ordering request.')
	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: current, error: currentError } = await supabase.from('people').select('team_group').eq('id', personId.data).maybeSingle()
	if (currentError || !current) throw new Error(`Could not load team group: ${currentError?.message ?? 'Profile not found.'}`)
	const { data: people, error: peopleError } = await supabase.from('people').select('id').eq('is_team_member', true).eq('team_group', current.team_group).order('display_order').order('display_name')
	if (peopleError) throw new Error(`Could not load team order: ${peopleError.message}`)
	const currentIndex = (people ?? []).findIndex((person) => person.id === personId.data)
	const destinationIndex = currentIndex + (direction.data === 'up' ? -1 : 1)
	if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= (people?.length ?? 0)) return
	const orderedIds = (people ?? []).map((person) => person.id)
	;[orderedIds[currentIndex], orderedIds[destinationIndex]] = [orderedIds[destinationIndex], orderedIds[currentIndex]]
	const updates = await Promise.all(orderedIds.map((id, displayOrder) => supabase.from('people').update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
	const failedUpdate = updates.find((result) => result.error)
	if (failedUpdate?.error) throw new Error(`Could not save team order: ${failedUpdate.error.message}`)
	revalidatePath('/admin/people')
	revalidatePath('/team')
}

export async function attachPersonPortraitAction(input: unknown) {
	const parsed = portraitSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid portrait upload.')
	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: media, error: mediaError } = await supabase.from('media_assets').insert({
		object_path: parsed.data.objectPath, original_filename: parsed.data.originalFilename, mime_type: parsed.data.mimeType,
		file_size_bytes: parsed.data.fileSizeBytes, width: parsed.data.width, height: parsed.data.height, uploaded_by: profile.id,
	}).select('id').single()
	if (mediaError) throw new Error(`The file uploaded, but its media record could not be created: ${mediaError.message}`)
	const { error: translationError } = await supabase.from('media_asset_translations').insert({ media_asset_id: media.id, locale: 'en', alt_text: parsed.data.altText })
	if (translationError) throw new Error(`The file uploaded, but its alt text could not be saved: ${translationError.message}`)
	const { error: personError } = await supabase.from('people').update({ portrait_media_id: media.id, updated_by: profile.id }).eq('id', parsed.data.personId)
	if (personError) throw new Error(`The media was created, but could not be attached: ${personError.message}`)
	await refreshPersonPaths(supabase, parsed.data.personId)
}

async function refreshPersonPaths(supabase: Awaited<ReturnType<typeof createClient>>, personId: string) {
	revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_NEWSROOM_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_OUTREACH_CACHE_TAG, 'max')
	revalidatePath('/admin')
	revalidatePath('/admin/people')
	revalidatePath(`/admin/people/${personId}`)
	revalidatePath('/team')
	for (const locale of locales.filter((locale) => locale !== 'en')) revalidatePath(`/${locale}/team`)
	const { data: translations } = await supabase.from('people_translations').select('locale, slug').eq('person_id', personId)
	for (const translation of translations ?? []) {
		const prefix = translation.locale === 'en' ? '' : `/${translation.locale}`
		revalidatePath(`${prefix}/team/${translation.slug}`)
	}
}

export type CatalogueKind = 'services' | 'sectors'
export type CatalogueActionState = { error?: string; success?: string; entryId?: string }

const catalogueKinds = ['services', 'sectors'] as const
const catalogueStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const optionalUuid = z.string().uuid().optional().transform((value) => value || null)
const catalogueDetailsSchema = z.object({
	kind: z.enum(catalogueKinds),
	entryId: z.string().uuid().optional(),
	stableKey: requiredKey,
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	iconMediaId: optionalUuid,
	contactIds: z.array(z.string().uuid()).max(30),
	articleIds: z.array(z.string().uuid()).max(100),
})
const catalogueTranslationSchema = z.object({
	kind: z.enum(catalogueKinds),
	entryId: z.string().uuid().optional(),
	locale: z.enum(locales),
	slug: requiredKey,
	name: z.string().trim().min(1, 'Enter a localized name.').max(160),
	summary: optionalText(2_000),
	content: z.unknown(),
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(catalogueStatuses),
	scheduledFor: z.string().optional().transform((value) => value?.trim() || null),
	iconAltText: optionalText(320),
})
const catalogueIconSchema = z.object({
	kind: z.enum(catalogueKinds),
	entryId: z.string().uuid(),
	objectPath: z.string().min(1).max(1_024),
	originalFilename: z.string().min(1).max(512),
	mimeType: z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
	fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	altText: z.string().trim().min(3).max(320),
})

function formJson(value: FormDataEntryValue | null, field: string): unknown {
	try {
		if (typeof value !== 'string') throw new Error()
		return JSON.parse(value)
	} catch {
		throw new Error(`${field} is not valid.`)
	}
}

function detailsFromForm(formData: FormData, includeEntryId = true) {
	return catalogueDetailsSchema.parse({
		kind: formData.get('kind'),
		entryId: includeEntryId ? formData.get('entryId') : undefined,
		stableKey: formData.get('stableKey'),
		displayOrder: formData.get('displayOrder'),
		iconMediaId: formData.get('iconMediaId') || undefined,
		contactIds: formJson(formData.get('contactIds'), 'Contacts'),
		articleIds: formJson(formData.get('articleIds'), 'Related articles'),
	})
}

function translationFromForm(formData: FormData) {
	const parsed = catalogueTranslationSchema.parse({
		kind: formData.get('kind'), entryId: formData.get('entryId') || undefined, locale: formData.get('locale'), slug: formData.get('slug'),
		name: formData.get('name'), summary: formData.get('summary') || undefined, content: formJson(formData.get('content'), 'Content'),
		seoTitle: formData.get('seoTitle') || undefined, seoDescription: formData.get('seoDescription') || undefined,
		status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined, iconAltText: formData.get('iconAltText') || undefined,
	})
	const scheduledFor = parsed.scheduledFor ? new Date(parsed.scheduledFor) : null
	if (parsed.status === 'scheduled' && (!scheduledFor || Number.isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())) {
		throw new Error('Choose a future scheduled publication time.')
	}
	return { ...parsed, content: parseCatalogueDocument(parsed.content), scheduledFor: scheduledFor?.toISOString() ?? null }
}

function uniqueIds(ids: string[], label: string) {
	if (new Set(ids).size !== ids.length) throw new Error(`${label} cannot contain duplicates.`)
	return ids
}

async function replaceCatalogueRelations(
	supabase: Awaited<ReturnType<typeof createClient>>,
	kind: CatalogueKind,
	entryId: string,
	contactIds: string[],
	articleIds: string[],
) {
	uniqueIds(contactIds, 'Contacts')
	uniqueIds(articleIds, 'Related articles')

	if (contactIds.length) {
		const { data: contacts, error } = await supabase.from('people').select('id').eq('is_active', true).eq('is_team_member', true).in('id', contactIds)
		if (error) throw new Error(`Could not validate team contacts: ${error.message}`)
		if ((contacts ?? []).length !== contactIds.length) throw new Error('Every contact must be an active team member.')
	}
	if (articleIds.length) {
		const { data: articles, error } = await supabase.from('articles').select('id').in('id', articleIds)
		if (error) throw new Error(`Could not validate related articles: ${error.message}`)
		if ((articles ?? []).length !== articleIds.length) throw new Error('One or more related articles no longer exist.')
	}

	if (kind === 'services') {
		const { error: contactDeleteError } = await supabase.from('service_people').delete().eq('service_id', entryId).eq('relationship', 'contact')
		if (contactDeleteError) throw new Error(`Could not update team contacts: ${contactDeleteError.message}`)
		if (contactIds.length) {
			const { error } = await supabase.from('service_people').insert(contactIds.map((person_id, display_order) => ({ service_id: entryId, person_id, relationship: 'contact', display_order })))
			if (error) throw new Error(`Could not save team contacts: ${error.message}`)
		}
		const { error: articleDeleteError } = await supabase.from('article_services').delete().eq('service_id', entryId)
		if (articleDeleteError) throw new Error(`Could not update related articles: ${articleDeleteError.message}`)
		if (articleIds.length) {
			const { error } = await supabase.from('article_services').insert(articleIds.map((article_id) => ({ service_id: entryId, article_id })))
			if (error) throw new Error(`Could not save related articles: ${error.message}`)
		}
		return
	}
	const { error: contactDeleteError } = await supabase.from('sector_people').delete().eq('sector_id', entryId).eq('relationship', 'contact')
	if (contactDeleteError) throw new Error(`Could not update team contacts: ${contactDeleteError.message}`)
	if (contactIds.length) {
		const { error } = await supabase.from('sector_people').insert(contactIds.map((person_id, display_order) => ({ sector_id: entryId, person_id, relationship: 'contact', display_order })))
		if (error) throw new Error(`Could not save team contacts: ${error.message}`)
	}
	const { error: articleDeleteError } = await supabase.from('article_sectors').delete().eq('sector_id', entryId)
	if (articleDeleteError) throw new Error(`Could not update related articles: ${articleDeleteError.message}`)
	if (articleIds.length) {
		const { error } = await supabase.from('article_sectors').insert(articleIds.map((article_id) => ({ sector_id: entryId, article_id })))
		if (error) throw new Error(`Could not save related articles: ${error.message}`)
	}
}

async function refreshCataloguePaths(supabase: Awaited<ReturnType<typeof createClient>>, kind: CatalogueKind, entryId?: string) {
	const publicSegment = kind === 'services' ? 'services' : 'sectors'
	revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_NEWSROOM_CACHE_TAG, 'max')
	if (kind === 'services') revalidateTag(PUBLIC_OUTREACH_CACHE_TAG, 'max')
	revalidatePath('/admin')
	revalidatePath('/admin/catalogue')
	revalidatePath(`/admin/catalogue/${kind}`)
	if (entryId) revalidatePath(`/admin/catalogue/${kind}/${entryId}`)
	revalidatePath(`/${publicSegment}`)
	for (const locale of locales.filter((locale) => locale !== 'en')) revalidatePath(`/${locale}/${publicSegment}`)
	if (entryId) {
		const { data } = kind === 'services'
			? await supabase.from('service_translations').select('locale, slug').eq('service_id', entryId)
			: await supabase.from('sector_translations').select('locale, slug').eq('sector_id', entryId)
		for (const translation of data ?? []) {
			const prefix = translation.locale === 'en' ? '' : `/${translation.locale}`
			revalidatePath(`${prefix}/${publicSegment}/${translation.slug}`)
		}
	}
}

export async function createCatalogueAction(_: CatalogueActionState, formData: FormData): Promise<CatalogueActionState> {
	try {
		const details = detailsFromForm(formData, false)
		const translation = translationFromForm(formData)
		if (translation.locale !== 'en') return { error: 'New catalogue entries must start with an English translation.' }
		if (translation.status === 'published' && details.iconMediaId && !translation.iconAltText) return { error: 'Published English content needs localized alt text for its selected icon.' }
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const entryId = randomUUID()
		const table = details.kind
		const { data: entry, error: createError } = await supabase.from(table).insert({ id: entryId, stable_key: details.stableKey, display_order: details.displayOrder, icon_media_id: details.iconMediaId, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (createError) return { error: `Could not create the ${details.kind.slice(0, -1)}: ${createError.message}` }
		const publication = publicationFields(translation.status, translation.scheduledFor)
		const { error: translationError } = details.kind === 'services'
			? await supabase.from('service_translations').insert({ service_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
			: await supabase.from('sector_translations').insert({ sector_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
		if (translationError) return { error: `The catalogue entry was created, but its English translation could not be saved: ${translationError.message}` }
		await replaceCatalogueRelations(supabase, details.kind, entry.id, details.contactIds, details.articleIds)
		if (translation.iconAltText && details.iconMediaId) await saveCatalogueIconAlt(supabase, details.iconMediaId, 'en', translation.iconAltText)
		await refreshCataloguePaths(supabase, details.kind, entry.id)
		return { success: 'Catalogue entry created.', entryId: entry.id }
	} catch (error) {
		return { error: error instanceof Error ? error.message : 'Could not create the catalogue entry.' }
	}
}

export async function saveCatalogueDetailsAction(_: CatalogueActionState, formData: FormData): Promise<CatalogueActionState> {
	try {
		const details = detailsFromForm(formData)
		if (!details.entryId) return { error: 'Invalid catalogue entry.' }
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from(details.kind).update({ stable_key: details.stableKey, display_order: details.displayOrder, icon_media_id: details.iconMediaId, updated_by: profile.id }).eq('id', details.entryId)
		if (error) return { error: `Could not save catalogue details: ${error.message}` }
		await replaceCatalogueRelations(supabase, details.kind, details.entryId, details.contactIds, details.articleIds)
		await refreshCataloguePaths(supabase, details.kind, details.entryId)
		return { success: 'Shared catalogue details saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save catalogue details.' } }
}

export async function saveCatalogueTranslationAction(_: CatalogueActionState, formData: FormData): Promise<CatalogueActionState> {
	try {
		const translation = translationFromForm(formData)
		if (!translation.entryId) return { error: 'Invalid catalogue entry.' }
		await requireActiveStaff()
		const supabase = await createClient()
		const { data: catalogueEntry, error: catalogueEntryError } = await supabase.from(translation.kind).select('icon_media_id').eq('id', translation.entryId).maybeSingle()
		if (catalogueEntryError || !catalogueEntry) return { error: `Could not load this catalogue entry: ${catalogueEntryError?.message ?? 'Entry not found.'}` }
		if (translation.status === 'published' && catalogueEntry.icon_media_id && !translation.iconAltText) return { error: 'Published localized content needs localized alt text for its selected icon.' }
		const publication = publicationFields(translation.status, translation.scheduledFor)
		const { error } = translation.kind === 'services'
			? await supabase.from('service_translations').upsert({ service_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'service_id,locale' })
			: await supabase.from('sector_translations').upsert({ sector_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'sector_id,locale' })
		if (error) return { error: `Could not save this translation: ${error.message}` }
		if (translation.iconAltText) {
			if (catalogueEntry.icon_media_id) await saveCatalogueIconAlt(supabase, catalogueEntry.icon_media_id, translation.locale, translation.iconAltText)
		}
		await refreshCataloguePaths(supabase, translation.kind, translation.entryId)
		return { success: `${translation.locale} translation saved.` }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save this translation.' } }
}

function publicationFields(status: (typeof catalogueStatuses)[number], scheduledFor: string | null) {
	return {
		status,
		scheduled_for: status === 'scheduled' ? scheduledFor : null,
		published_at: status === 'published' ? new Date().toISOString() : null,
	}
}

async function saveCatalogueIconAlt(supabase: Awaited<ReturnType<typeof createClient>>, mediaId: string, locale: (typeof locales)[number], altText: string) {
	const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: mediaId, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' })
	if (error) throw new Error(`Could not save localized icon alt text: ${error.message}`)
}

export async function attachCatalogueIconAction(input: unknown): Promise<CatalogueActionState> {
	try {
		const parsed = catalogueIconSchema.parse(input)
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: parsed.objectPath, original_filename: parsed.originalFilename, mime_type: parsed.mimeType, file_size_bytes: parsed.fileSizeBytes, width: parsed.width, height: parsed.height, uploaded_by: profile.id }).select('id').single()
		if (mediaError) return { error: `The file uploaded, but its media record could not be created: ${mediaError.message}` }
		await saveCatalogueIconAlt(supabase, media.id, 'en', parsed.altText)
		const { error: attachError } = await supabase.from(parsed.kind).update({ icon_media_id: media.id, updated_by: profile.id }).eq('id', parsed.entryId)
		if (attachError) return { error: `The icon was saved, but could not be attached: ${attachError.message}` }
		await refreshCataloguePaths(supabase, parsed.kind, parsed.entryId)
		return { success: 'Icon uploaded and attached.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not upload the icon.' } }
}

export async function setCatalogueArchivedAction(_: CatalogueActionState, formData: FormData): Promise<CatalogueActionState> {
	try {
		const kind = z.enum(catalogueKinds).parse(formData.get('kind'))
		const entryId = z.string().uuid().parse(formData.get('entryId'))
		const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from(kind).update({ is_active: !archive, updated_by: profile.id }).eq('id', entryId)
		if (error) return { error: `Could not ${archive ? 'archive' : 'restore'} this catalogue entry: ${error.message}` }
		await refreshCataloguePaths(supabase, kind, entryId)
		return { success: archive ? 'Catalogue entry archived.' : 'Catalogue entry restored.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update this catalogue entry.' } }
}

export async function moveCatalogueAction(_: CatalogueActionState, formData: FormData): Promise<CatalogueActionState> {
	try {
		const kind = z.enum(catalogueKinds).parse(formData.get('kind'))
		const entryId = z.string().uuid().parse(formData.get('entryId'))
		const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: entries, error } = await supabase.from(kind).select('id').eq('is_active', true).order('display_order').order('stable_key')
		if (error) return { error: `Could not load catalogue order: ${error.message}` }
		const current = (entries ?? []).findIndex((entry) => entry.id === entryId)
		const destination = current + (direction === 'up' ? -1 : 1)
		if (current < 0 || destination < 0 || destination >= (entries?.length ?? 0)) return { success: 'Catalogue order is unchanged.' }
		const ids = (entries ?? []).map((entry) => entry.id)
		;[ids[current], ids[destination]] = [ids[destination], ids[current]]
		const results = await Promise.all(ids.map((id, displayOrder) => supabase.from(kind).update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
		const failed = results.find((result) => result.error)
		if (failed?.error) return { error: `Could not save catalogue order: ${failed.error.message}` }
		await refreshCataloguePaths(supabase, kind)
		return { success: 'Catalogue order saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update catalogue order.' } }
}

export type OutreachActionState = { error?: string; success?: string; entryId?: string; countryCode?: string }

const outreachStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const isoCountryCode = z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use a two-letter ISO 3166-1 alpha-2 country code.').transform((value) => value.toUpperCase())
const optionalNumber = z.union([z.number(), z.string()]).optional().transform((value) => value === undefined || value === '' ? null : Number(value))
const outreachMapConfig = z.object({
	longitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -180 && value <= 180), 'Map longitude must be between -180 and 180.'),
	latitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -90 && value <= 90), 'Map latitude must be between -90 and 90.'),
	zoom: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value > 0 && value <= 10), 'Map zoom must be greater than 0 and no more than 10.'),
})
const outreachUrl = z.string().trim().max(2_048).superRefine((value, context) => {
	try {
		const protocol = new URL(value).protocol
		if (protocol !== 'http:' && protocol !== 'https:') context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' })
	} catch { context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' }) }
})

function mapConfigFromForm(formData: FormData) {
	const parsed = outreachMapConfig.parse({ longitude: formData.get('mapLongitude') || undefined, latitude: formData.get('mapLatitude') || undefined, zoom: formData.get('mapZoom') || undefined })
	if ((parsed.longitude === null) !== (parsed.latitude === null)) throw new Error('Provide both map longitude and latitude, or leave both empty.')
	if (parsed.zoom !== null && parsed.longitude === null) throw new Error('Map zoom requires a map longitude and latitude.')
	return parsed.longitude === null ? {} : { coordinates: [parsed.longitude, parsed.latitude], ...(parsed.zoom === null ? {} : { zoom: parsed.zoom }) }
}

function outreachPublication(status: (typeof outreachStatuses)[number], scheduledFor: string | null) {
	const scheduled = scheduledFor ? new Date(scheduledFor) : null
	if (status === 'scheduled' && (!scheduled || Number.isNaN(scheduled.getTime()) || scheduled <= new Date())) throw new Error('Choose a future scheduled publication time.')
	return { status, scheduled_for: status === 'scheduled' ? scheduled?.toISOString() ?? null : null, published_at: status === 'published' ? new Date().toISOString() : null }
}

async function refreshOutreachPaths(supabase: Awaited<ReturnType<typeof createClient>>, countryCode?: string) {
	revalidateTag(PUBLIC_OUTREACH_CACHE_TAG, 'max')
	revalidatePath('/admin')
	revalidatePath('/admin/outreach')
	revalidatePath('/admin/outreach/regions')
	revalidatePath('/admin/outreach/offices')
	if (countryCode) revalidatePath(`/admin/outreach/${countryCode}`)
	revalidatePath('/our-outreach')
	for (const locale of locales.filter((locale) => locale !== 'en')) revalidatePath(`/${locale}/our-outreach`)
	if (countryCode) {
		const { data } = await supabase.from('country_translations').select('locale, slug').eq('country_code', countryCode)
		for (const translation of data ?? []) {
			const prefix = translation.locale === 'en' ? '' : `/${translation.locale}`
			revalidatePath(`${prefix}/our-outreach/${translation.slug}`)
		}
	}
}

const regionDetailsSchema = z.object({ regionId: z.string().uuid().optional(), stableKey: requiredKey, displayOrder: z.coerce.number().int().min(0).max(100_000) })
const regionTranslationSchema = z.object({ regionId: z.string().uuid().optional(), locale: z.enum(locales), slug: requiredKey, name: z.string().trim().min(1).max(160), status: z.enum(outreachStatuses), scheduledFor: optionalText(64) })

function regionDetailsFromForm(formData: FormData, includeId = true) {
	return { ...regionDetailsSchema.parse({ regionId: includeId ? formData.get('regionId') || undefined : undefined, stableKey: formData.get('stableKey'), displayOrder: formData.get('displayOrder') }), mapConfig: mapConfigFromForm(formData) }
}
function regionTranslationFromForm(formData: FormData, includeId = true) {
	const parsed = regionTranslationSchema.parse({ regionId: includeId ? formData.get('regionId') || undefined : undefined, locale: formData.get('locale'), slug: formData.get('slug'), name: formData.get('name'), status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined })
	return { ...parsed, ...outreachPublication(parsed.status, parsed.scheduledFor) }
}

export async function createRegionAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const details = regionDetailsFromForm(formData, false); const translation = regionTranslationFromForm(formData, false)
		if (translation.locale !== 'en') return { error: 'New regions must start with an English translation.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID()
		const { error: regionError } = await supabase.from('regions').insert({ id, stable_key: details.stableKey, display_order: details.displayOrder, map_config: details.mapConfig, created_by: profile.id, updated_by: profile.id })
		if (regionError) return { error: `Could not create the region: ${regionError.message}` }
		const { error: translationError } = await supabase.from('region_translations').insert({ region_id: id, locale: 'en', slug: translation.slug, name: translation.name, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at })
		if (translationError) return { error: `The region was created, but its English translation could not be saved: ${translationError.message}` }
		await refreshOutreachPaths(supabase); return { success: 'Region created.', entryId: id }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the region.' } }
}

export async function saveRegionDetailsAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const details = regionDetailsFromForm(formData); if (!details.regionId) return { error: 'Invalid region.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('regions').update({ stable_key: details.stableKey, display_order: details.displayOrder, map_config: details.mapConfig, updated_by: profile.id }).eq('id', details.regionId)
		if (error) return { error: `Could not save region details: ${error.message}` }; await refreshOutreachPaths(supabase); return { success: 'Region details saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save region details.' } }
}

export async function saveRegionTranslationAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const translation = regionTranslationFromForm(formData); if (!translation.regionId) return { error: 'Invalid region.' }
		await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('region_translations').upsert({ region_id: translation.regionId, locale: translation.locale, slug: translation.slug, name: translation.name, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }, { onConflict: 'region_id,locale' })
		if (error) return { error: `Could not save this region translation: ${error.message}` }; await refreshOutreachPaths(supabase); return { success: `${translation.locale} translation saved.` }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save this region translation.' } }
}

export async function setRegionArchivedAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const regionId = z.string().uuid().parse(formData.get('regionId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('regions').update({ is_active: !archive, updated_by: profile.id }).eq('id', regionId)
		if (error) return { error: `Could not ${archive ? 'archive' : 'restore'} this region: ${error.message}` }; await refreshOutreachPaths(supabase); return { success: archive ? 'Region archived.' : 'Region restored.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update this region.' } }
}

const countryDetailsSchema = z.object({
	countryCode: isoCountryCode, regionId: optionalUuid, isCovered: z.boolean(), displayOrder: z.coerce.number().int().min(0).max(100_000), lastReviewedOn: optionalText(10).refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use a valid review date.'), flagMediaId: optionalUuid, outlineMediaId: optionalUuid,
	serviceAssignments: z.array(z.object({ serviceId: z.string().uuid(), coverageLevel: optionalText(120) }).strict()).max(100), expertIds: z.array(z.string().uuid()).max(50), officeIds: z.array(z.string().uuid()).max(100),
	statistics: z.array(z.object({ id: z.string().uuid().optional(), metricKey: requiredKey, numericValue: optionalNumber.refine((value) => value === null || Number.isFinite(value), 'Statistic value must be a number.'), unit: optionalText(120), statisticYear: optionalNumber.refine((value) => value === null || (Number.isInteger(value) && value >= 1900 && value <= 2200), 'Statistic year must be between 1900 and 2200.'), sourceUrl: optionalText(2_048).refine((value) => value === null || outreachUrl.safeParse(value).success, 'Use a complete http or https source URL.'), displayOrder: z.coerce.number().int().min(0).max(100_000) }).strict()).max(100),
})
const countryTranslationSchema = z.object({ countryCode: isoCountryCode, locale: z.enum(locales), slug: requiredKey, name: z.string().trim().min(1).max(160), summary: optionalText(2_000), coverageSummary: optionalText(2_000), content: z.unknown(), seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(outreachStatuses), scheduledFor: optionalText(64), flagAltText: optionalText(320), outlineAltText: optionalText(320), serviceCopies: z.array(z.object({ serviceId: z.string().uuid(), summary: optionalText(2_000), content: z.unknown() }).strict()).max(100), statisticLabels: z.array(z.object({ statisticId: z.string().uuid(), label: z.string().trim().min(1).max(160), displayValue: optionalText(320) }).strict()).max(100) })

function countryDetailsFromForm(formData: FormData) {
	const parsed = countryDetailsSchema.parse({ countryCode: formData.get('countryCode'), regionId: formData.get('regionId') || undefined, isCovered: formData.get('isCovered') === 'on', displayOrder: formData.get('displayOrder'), lastReviewedOn: formData.get('lastReviewedOn') || undefined, flagMediaId: formData.get('flagMediaId') || undefined, outlineMediaId: formData.get('outlineMediaId') || undefined, serviceAssignments: formJson(formData.get('serviceAssignments'), 'Country services'), expertIds: formJson(formData.get('expertIds'), 'Country experts'), officeIds: formJson(formData.get('officeIds'), 'Country offices'), statistics: formJson(formData.get('statistics'), 'Statistics') })
	uniqueIds(parsed.serviceAssignments.map((item) => item.serviceId), 'Country services'); uniqueIds(parsed.expertIds, 'Country experts'); uniqueIds(parsed.officeIds, 'Country offices'); uniqueIds(parsed.statistics.map((item) => item.metricKey), 'Statistic metric keys')
	return { ...parsed, mapConfig: mapConfigFromForm(formData) }
}
function countryTranslationFromForm(formData: FormData) {
	const parsed = countryTranslationSchema.parse({ countryCode: formData.get('countryCode'), locale: formData.get('locale'), slug: formData.get('slug'), name: formData.get('name'), summary: formData.get('summary') || undefined, coverageSummary: formData.get('coverageSummary') || undefined, content: formJson(formData.get('content'), 'Country content'), seoTitle: formData.get('seoTitle') || undefined, seoDescription: formData.get('seoDescription') || undefined, status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined, flagAltText: formData.get('flagAltText') || undefined, outlineAltText: formData.get('outlineAltText') || undefined, serviceCopies: formJson(formData.get('serviceCopies'), 'Country service copy'), statisticLabels: formJson(formData.get('statisticLabels'), 'Statistic labels') })
	return { ...parsed, content: parseCatalogueDocument(parsed.content), serviceCopies: parsed.serviceCopies.map((copy) => ({ ...copy, content: parseCatalogueDocument(copy.content) })), ...outreachPublication(parsed.status, parsed.scheduledFor) }
}

async function replaceCountryRelations(supabase: Awaited<ReturnType<typeof createClient>>, details: ReturnType<typeof countryDetailsFromForm>) {
	if (details.serviceAssignments.length) { const { data, error } = await supabase.from('services').select('id').eq('is_active', true).in('id', details.serviceAssignments.map((item) => item.serviceId)); if (error) throw new Error(`Could not validate country services: ${error.message}`); if ((data ?? []).length !== details.serviceAssignments.length) throw new Error('Every assigned service must be active.') }
	if (details.expertIds.length) { const { data, error } = await supabase.from('people').select('id').eq('is_active', true).in('id', details.expertIds); if (error) throw new Error(`Could not validate country experts: ${error.message}`); if ((data ?? []).length !== details.expertIds.length) throw new Error('Every country expert must be active.') }
	if (details.officeIds.length) { const { data, error } = await supabase.from('offices').select('id').eq('is_active', true).in('id', details.officeIds); if (error) throw new Error(`Could not validate country offices: ${error.message}`); if ((data ?? []).length !== details.officeIds.length) throw new Error('Every assigned office must be active.') }
	const serviceIds = details.serviceAssignments.map((item) => item.serviceId)
	const metricKeys = details.statistics.map((item) => item.metricKey)
	const serviceDelete = serviceIds.length ? supabase.from('country_services').delete().eq('country_code', details.countryCode).not('service_id', 'in', `(${serviceIds.join(',')})`) : supabase.from('country_services').delete().eq('country_code', details.countryCode)
	const statisticDelete = metricKeys.length ? supabase.from('country_statistics').delete().eq('country_code', details.countryCode).not('metric_key', 'in', `(${metricKeys.join(',')})`) : supabase.from('country_statistics').delete().eq('country_code', details.countryCode)
	const deletions = await Promise.all([serviceDelete, supabase.from('country_people').delete().eq('country_code', details.countryCode).eq('relationship', 'expert'), supabase.from('country_offices').delete().eq('country_code', details.countryCode), statisticDelete])
	const failedDeletion = deletions.find((result) => result.error); if (failedDeletion?.error) throw new Error(`Could not replace country relations: ${failedDeletion.error.message}`)
	if (details.serviceAssignments.length) { const { error } = await supabase.from('country_services').upsert(details.serviceAssignments.map((item, display_order) => ({ country_code: details.countryCode, service_id: item.serviceId, coverage_level: item.coverageLevel, display_order })), { onConflict: 'country_code,service_id' }); if (error) throw new Error(`Could not save country services: ${error.message}`) }
	if (details.expertIds.length) { const { error } = await supabase.from('country_people').insert(details.expertIds.map((person_id, display_order) => ({ country_code: details.countryCode, person_id, relationship: 'expert', display_order }))); if (error) throw new Error(`Could not save country experts: ${error.message}`) }
	if (details.officeIds.length) { const { error } = await supabase.from('country_offices').insert(details.officeIds.map((office_id, display_order) => ({ country_code: details.countryCode, office_id, display_order }))); if (error) throw new Error(`Could not save country offices: ${error.message}`) }
	if (details.statistics.length) { const { error } = await supabase.from('country_statistics').upsert(details.statistics.map((item) => ({ country_code: details.countryCode, metric_key: item.metricKey, numeric_value: item.numericValue, unit: item.unit, statistic_year: item.statisticYear, source_url: item.sourceUrl, display_order: item.displayOrder })), { onConflict: 'country_code,metric_key' }); if (error) throw new Error(`Could not save country statistics: ${error.message}`) }
}

async function saveCountryMediaAlts(supabase: Awaited<ReturnType<typeof createClient>>, countryCode: string, locale: (typeof locales)[number], flagAltText: string | null, outlineAltText: string | null) {
	const { data: country, error } = await supabase.from('countries').select('flag_media_id, outline_media_id').eq('code', countryCode).maybeSingle(); if (error || !country) throw new Error(`Could not load country media: ${error?.message ?? 'Country not found.'}`)
	for (const [mediaId, altText] of [[country.flag_media_id, flagAltText], [country.outline_media_id, outlineAltText]] as const) { if (mediaId && altText) { const { error: altError } = await supabase.from('media_asset_translations').upsert({ media_asset_id: mediaId, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' }); if (altError) throw new Error(`Could not save localized media alt text: ${altError.message}`) } }
}

export async function createCountryAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const details = countryDetailsFromForm(formData); const translation = countryTranslationFromForm(formData); if (translation.locale !== 'en') return { error: 'New countries must start with an English translation.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error: countryError } = await supabase.from('countries').insert({ code: details.countryCode, region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, created_by: profile.id, updated_by: profile.id })
		if (countryError) return { error: `Could not create the country: ${countryError.message}` }
		const { error: translationError } = await supabase.from('country_translations').insert({ country_code: details.countryCode, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at })
		if (translationError) return { error: `The country was created, but its English translation could not be saved: ${translationError.message}` }
		await replaceCountryRelations(supabase, details); await saveCountryMediaAlts(supabase, details.countryCode, 'en', translation.flagAltText, translation.outlineAltText); await refreshOutreachPaths(supabase, details.countryCode); return { success: 'Country created.', countryCode: details.countryCode }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the country.' } }
}

export async function saveCountryDetailsAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const details = countryDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('countries').update({ region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, updated_by: profile.id }).eq('code', details.countryCode)
		if (error) return { error: `Could not save country details: ${error.message}` }; await replaceCountryRelations(supabase, details); await refreshOutreachPaths(supabase, details.countryCode); return { success: 'Country identity, coverage, ordering, and relations saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save country details.' } }
}

export async function saveCountryTranslationAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> {
	try {
		const translation = countryTranslationFromForm(formData); const supabase = await createClient(); await requireActiveStaff()
		const { data: country, error: countryError } = await supabase.from('countries').select('flag_media_id, outline_media_id').eq('code', translation.countryCode).maybeSingle(); if (countryError || !country) return { error: `Could not load country details: ${countryError?.message ?? 'Country not found.'}` }
		if (translation.status === 'published' && ((country.flag_media_id && !translation.flagAltText) || (country.outline_media_id && !translation.outlineAltText))) return { error: 'Published localized country content needs alt text for each selected media asset.' }
		const { error } = await supabase.from('country_translations').upsert({ country_code: translation.countryCode, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }, { onConflict: 'country_code,locale' })
		if (error) return { error: `Could not save this country translation: ${error.message}` }
		const { data: assignments, error: assignmentError } = await supabase.from('country_services').select('service_id').eq('country_code', translation.countryCode); if (assignmentError) return { error: `Could not validate country services: ${assignmentError.message}` }
		const assigned = new Set((assignments ?? []).map((item) => item.service_id)); if (translation.serviceCopies.some((item) => !assigned.has(item.serviceId))) return { error: 'Country service copy can only be saved for assigned services.' }
		const { error: deleteCopiesError } = await supabase.from('country_service_translations').delete().eq('country_code', translation.countryCode).eq('locale', translation.locale); if (deleteCopiesError) return { error: `Could not update country service copy: ${deleteCopiesError.message}` }
		if (translation.serviceCopies.length) { const { error: copiesError } = await supabase.from('country_service_translations').insert(translation.serviceCopies.map((item) => ({ country_code: translation.countryCode, service_id: item.serviceId, locale: translation.locale, summary: item.summary, content: item.content }))); if (copiesError) return { error: `Could not save country service copy: ${copiesError.message}` } }
		if (translation.statisticLabels.length) { const { data: statistics, error: statisticsError } = await supabase.from('country_statistics').select('id').eq('country_code', translation.countryCode); if (statisticsError) return { error: `Could not validate statistics: ${statisticsError.message}` }; const statisticIds = new Set((statistics ?? []).map((item) => item.id)); if (translation.statisticLabels.some((item) => !statisticIds.has(item.statisticId))) return { error: 'Statistic labels must belong to this country.' }; const { error: labelsError } = await supabase.from('country_statistic_translations').upsert(translation.statisticLabels.map((item) => ({ statistic_id: item.statisticId, locale: translation.locale, label: item.label, display_value: item.displayValue })), { onConflict: 'statistic_id,locale' }); if (labelsError) return { error: `Could not save statistic labels: ${labelsError.message}` } }
		await saveCountryMediaAlts(supabase, translation.countryCode, translation.locale, translation.flagAltText, translation.outlineAltText); await refreshOutreachPaths(supabase, translation.countryCode); return { success: `${translation.locale} country content saved.` }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save this country translation.' } }
}

const officeDetailsSchema = z.object({ officeId: z.string().uuid().optional(), stableKey: requiredKey, countryCode: z.union([isoCountryCode, z.literal('')]).transform((value) => value || null), email: optionalText(320).refine((value) => value === null || z.string().email().safeParse(value).success, 'Enter a valid email address.'), phone: optionalText(80), latitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -90 && value <= 90), 'Latitude must be between -90 and 90.'), longitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -180 && value <= 180), 'Longitude must be between -180 and 180.'), displayOrder: z.coerce.number().int().min(0).max(100_000) })
const officeTranslationSchema = z.object({ officeId: z.string().uuid().optional(), locale: z.enum(locales), name: z.string().trim().min(1).max(160), city: optionalText(160), address: optionalText(2_000), status: z.enum(outreachStatuses), scheduledFor: optionalText(64) })
function officeDetailsFromForm(formData: FormData, includeId = true) { return officeDetailsSchema.parse({ officeId: includeId ? formData.get('officeId') || undefined : undefined, stableKey: formData.get('stableKey'), countryCode: formData.get('countryCode') || '', email: formData.get('email') || undefined, phone: formData.get('phone') || undefined, latitude: formData.get('latitude') || undefined, longitude: formData.get('longitude') || undefined, displayOrder: formData.get('displayOrder') }) }
function officeTranslationFromForm(formData: FormData, includeId = true) { const parsed = officeTranslationSchema.parse({ officeId: includeId ? formData.get('officeId') || undefined : undefined, locale: formData.get('locale'), name: formData.get('name'), city: formData.get('city') || undefined, address: formData.get('address') || undefined, status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined }); return { ...parsed, ...outreachPublication(parsed.status, parsed.scheduledFor) } }
async function refreshOfficePaths(supabase: Awaited<ReturnType<typeof createClient>>, countryCode?: string) { await refreshOutreachPaths(supabase, countryCode) }
export async function createOfficeAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> { try { const details = officeDetailsFromForm(formData, false); const translation = officeTranslationFromForm(formData, false); if (translation.locale !== 'en') return { error: 'New offices must start with an English translation.' }; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID(); const { error: officeError } = await supabase.from('offices').insert({ id, stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: details.displayOrder, created_by: profile.id, updated_by: profile.id }); if (officeError) return { error: `Could not create the office: ${officeError.message}` }; const { error: translationError } = await supabase.from('office_translations').insert({ office_id: id, locale: 'en', name: translation.name, city: translation.city, address: translation.address, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }); if (translationError) return { error: `The office was created, but its English translation could not be saved: ${translationError.message}` }; await refreshOfficePaths(supabase, details.countryCode ?? undefined); return { success: 'Office created.', entryId: id } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the office.' } } }
export async function saveOfficeDetailsAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> { try { const details = officeDetailsFromForm(formData); if (!details.officeId) return { error: 'Invalid office.' }; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.officeId); if (error) return { error: `Could not save office details: ${error.message}` }; await refreshOfficePaths(supabase, details.countryCode ?? undefined); return { success: 'Office details saved.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save office details.' } } }
export async function saveOfficeTranslationAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> { try { const translation = officeTranslationFromForm(formData); if (!translation.officeId) return { error: 'Invalid office.' }; await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('office_translations').upsert({ office_id: translation.officeId, locale: translation.locale, name: translation.name, city: translation.city, address: translation.address, status: translation.status, scheduled_for: translation.scheduled_for, published_at: translation.published_at }, { onConflict: 'office_id,locale' }); if (error) return { error: `Could not save this office translation: ${error.message}` }; await refreshOfficePaths(supabase); return { success: `${translation.locale} office content saved.` } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save this office translation.' } } }
export async function setOfficeArchivedAction(_: OutreachActionState, formData: FormData): Promise<OutreachActionState> { try { const officeId = z.string().uuid().parse(formData.get('officeId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ is_active: !archive, updated_by: profile.id }).eq('id', officeId); if (error) return { error: `Could not ${archive ? 'archive' : 'restore'} this office: ${error.message}` }; await refreshOfficePaths(supabase); return { success: archive ? 'Office archived.' : 'Office restored.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not update this office.' } } }

export type ArticleActionState = { error?: string; success?: string; entryId?: string }

const articleStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const httpUrl = z.string().trim().max(2_048).superRefine((value, context) => {
	try {
		const protocol = new URL(value).protocol
		if (protocol !== 'http:' && protocol !== 'https:') context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' })
	} catch { context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' }) }
})
const articleDetailsSchema = z.object({
	articleId: z.string().uuid().optional(),
	stableKey: requiredKey,
	kind: z.string().trim().regex(/^[a-z][a-z0-9-]*$/, 'Article kind must use lowercase letters, numbers and hyphens.').max(80),
	coverMediaId: optionalUuid,
	externalMediaUrl: optionalText(2_048).refine((value) => value === null || httpUrl.safeParse(value).success, 'Enter a complete external media URL.'),
	isFeatured: z.boolean(),
	featuredOrder: z.coerce.number().int().min(0).max(100_000),
	authorIds: z.array(z.string().uuid()).max(30),
	tagIds: z.array(z.string().uuid()).max(100),
	serviceIds: z.array(z.string().uuid()).max(100),
	sectorIds: z.array(z.string().uuid()).max(100),
	relatedArticleIds: z.array(z.string().uuid()).max(100),
})
const articleTranslationSchema = z.object({
	articleId: z.string().uuid().optional(), locale: z.enum(locales), slug: requiredKey,
	title: z.string().trim().min(2).max(300), excerpt: optionalText(2_000), content: z.unknown(),
	sources: z.array(z.object({ label: z.string().trim().min(1).max(300), url: httpUrl }).strict()).max(50),
	seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(articleStatuses),
	scheduledFor: optionalText(64), coverAltText: optionalText(320),
})
const articleCoverSchema = z.object({
	articleId: z.string().uuid(), objectPath: z.string().min(1).max(1024), originalFilename: z.string().min(1).max(512),
	mimeType: z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']), fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
	width: z.number().int().positive().nullable(), height: z.number().int().positive().nullable(), altText: z.string().trim().min(3).max(320),
})

function articleDetailsFromForm(formData: FormData, requireId = true) {
	const parsed = articleDetailsSchema.safeParse({ articleId: formData.get('articleId') || undefined, stableKey: formData.get('stableKey'), kind: formData.get('kind'), coverMediaId: formData.get('coverMediaId') || undefined, externalMediaUrl: formData.get('externalMediaUrl') || undefined, isFeatured: formData.get('isFeatured') === 'on', featuredOrder: formData.get('featuredOrder'), authorIds: formJson(formData.get('authorIds'), 'Authors'), tagIds: formJson(formData.get('tagIds'), 'Tags'), serviceIds: formJson(formData.get('serviceIds'), 'Services'), sectorIds: formJson(formData.get('sectorIds'), 'Sectors'), relatedArticleIds: formJson(formData.get('relatedArticleIds'), 'Related articles') })
	if (!parsed.success || (requireId && !parsed.data?.articleId)) throw new Error(parsed.error?.issues[0]?.message ?? 'Enter valid article details.')
	for (const [ids, label] of [[parsed.data.authorIds, 'Authors'], [parsed.data.tagIds, 'Tags'], [parsed.data.serviceIds, 'Services'], [parsed.data.sectorIds, 'Sectors'], [parsed.data.relatedArticleIds, 'Related articles']] as const) uniqueIds(ids, label)
	if (parsed.data.relatedArticleIds.includes(parsed.data.articleId ?? '')) throw new Error('An article cannot be related to itself.')
	return parsed.data
}
function articleTranslationFromForm(formData: FormData, requireId = true) {
	const parsed = articleTranslationSchema.safeParse({ articleId: formData.get('articleId') || undefined, locale: formData.get('locale'), slug: formData.get('slug'), title: formData.get('title'), excerpt: formData.get('excerpt') || undefined, content: formJson(formData.get('content'), 'Article content'), sources: formJson(formData.get('sources'), 'Sources'), seoTitle: formData.get('seoTitle') || undefined, seoDescription: formData.get('seoDescription') || undefined, status: formData.get('status'), scheduledFor: formData.get('scheduledFor') || undefined, coverAltText: formData.get('coverAltText') || undefined })
	if (!parsed.success || (requireId && !parsed.data?.articleId)) throw new Error(parsed.error?.issues[0]?.message ?? 'Enter valid localized article content.')
	let content
	try { content = parseArticleDocument(parsed.data.content) } catch (error) { throw new Error(error instanceof Error ? error.message : 'Article content is invalid.') }
	return { ...parsed.data, content }
}
function articlePublication(status: (typeof articleStatuses)[number], scheduledFor: string | null) {
	if (status === 'scheduled') {
		if (!scheduledFor || Number.isNaN(Date.parse(scheduledFor))) throw new Error('Choose a valid scheduled publication time.')
		return { status, scheduled_for: new Date(scheduledFor).toISOString(), published_at: null }
	}
	return { status, scheduled_for: null, published_at: status === 'published' ? new Date().toISOString() : null }
}
async function validateRelationIds(supabase: Awaited<ReturnType<typeof createClient>>, table: 'people' | 'tags' | 'services' | 'sectors' | 'articles', ids: string[], label: string) {
	if (!ids.length) return
	const result = table === 'people'
		? await supabase.from('people').select('id').in('id', ids).eq('is_active', true).eq('is_author', true)
		: table === 'tags'
			? await supabase.from('tags').select('id').in('id', ids).eq('is_active', true)
			: table === 'services'
				? await supabase.from('services').select('id').in('id', ids).eq('is_active', true)
				: table === 'sectors'
					? await supabase.from('sectors').select('id').in('id', ids).eq('is_active', true)
					: await supabase.from('articles').select('id').in('id', ids)
	const { data, error } = result
	if (error) throw new Error(`Could not validate ${label.toLowerCase()}: ${error.message}`)
	if ((data ?? []).length !== ids.length) throw new Error(`One or more selected ${label.toLowerCase()} are unavailable. Refresh and try again.`)
}
async function replaceArticleRelations(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, details: ReturnType<typeof articleDetailsFromForm>) {
	await Promise.all([
		validateRelationIds(supabase, 'people', details.authorIds, 'authors'), validateRelationIds(supabase, 'tags', details.tagIds, 'tags'), validateRelationIds(supabase, 'services', details.serviceIds, 'services'), validateRelationIds(supabase, 'sectors', details.sectorIds, 'sectors'), validateRelationIds(supabase, 'articles', details.relatedArticleIds, 'related articles'),
	])
	const deletes = await Promise.all([
		supabase.from('article_authors').delete().eq('article_id', articleId), supabase.from('article_tags').delete().eq('article_id', articleId), supabase.from('article_services').delete().eq('article_id', articleId), supabase.from('article_sectors').delete().eq('article_id', articleId), supabase.from('article_relations').delete().eq('source_article_id', articleId),
	])
	const failed = deletes.find((result) => result.error)
	if (failed?.error) throw new Error(`Could not replace article relations: ${failed.error.message}`)
	const inserts = await Promise.all([
		details.authorIds.length ? supabase.from('article_authors').insert(details.authorIds.map((person_id, display_order) => ({ article_id: articleId, person_id, display_order }))) : Promise.resolve({ error: null }),
		details.tagIds.length ? supabase.from('article_tags').insert(details.tagIds.map((tag_id) => ({ article_id: articleId, tag_id }))) : Promise.resolve({ error: null }),
		details.serviceIds.length ? supabase.from('article_services').insert(details.serviceIds.map((service_id) => ({ article_id: articleId, service_id }))) : Promise.resolve({ error: null }),
		details.sectorIds.length ? supabase.from('article_sectors').insert(details.sectorIds.map((sector_id) => ({ article_id: articleId, sector_id }))) : Promise.resolve({ error: null }),
		details.relatedArticleIds.length ? supabase.from('article_relations').insert(details.relatedArticleIds.map((related_article_id, display_order) => ({ source_article_id: articleId, related_article_id, display_order }))) : Promise.resolve({ error: null }),
	])
	const failedInsert = inserts.find((result) => result.error)
	if (failedInsert?.error) throw new Error(`Could not save article relations: ${failedInsert.error.message}`)
}
async function ensureArticleCanPublish(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, translation: ReturnType<typeof articleTranslationFromForm>) {
	if (translation.status !== 'published') return
	const { data: article, error } = await supabase.from('articles').select('cover_media_id, external_media_url').eq('id', articleId).maybeSingle()
	if (error || !article) throw new Error(`Could not load article media: ${error?.message ?? 'Article not found.'}`)
	if (!article.cover_media_id && !article.external_media_url) throw new Error('Published articles need a cover image or external media URL.')
	if (article.cover_media_id && !translation.coverAltText) throw new Error('Published localized content needs localized alt text for its cover image.')
}
async function validateArticleInlineMedia(supabase: Awaited<ReturnType<typeof createClient>>, translation: ReturnType<typeof articleTranslationFromForm>) {
	const mediaIds = articleImageMediaIds(translation.content)
	if (!mediaIds.length) return
	const { data, error } = await supabase.from('media_assets').select('id, mime_type, is_public').in('id', mediaIds)
	if (error) throw new Error(`Could not validate inline article media: ${error.message}`)
	if ((data ?? []).length !== mediaIds.length) throw new Error('One or more inline article images no longer exist in the managed media library.')
	if ((data ?? []).some((asset) => !asset.mime_type?.startsWith('image/'))) throw new Error('Inline article media must use managed image assets.')
	if ((translation.status === 'published' || translation.status === 'scheduled') && (data ?? []).some((asset) => !asset.is_public)) throw new Error('Published or scheduled article images must be public managed media assets.')
}
async function saveArticleCoverAlt(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, locale: (typeof locales)[number], altText: string | null) {
	if (!altText) return
	const { data: article } = await supabase.from('articles').select('cover_media_id').eq('id', articleId).maybeSingle()
	if (!article?.cover_media_id) return
	const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: article.cover_media_id, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' })
	if (error) throw new Error(`Could not save localized cover alt text: ${error.message}`)
}
async function refreshNewsroomPaths(supabase: Awaited<ReturnType<typeof createClient>>, articleId?: string) {
	revalidateTag(PUBLIC_CATALOGUE_CACHE_TAG, 'max')
	revalidateTag(PUBLIC_NEWSROOM_CACHE_TAG, 'max')
	revalidatePath('/admin'); revalidatePath('/admin/newsroom'); if (articleId) revalidatePath(`/admin/newsroom/${articleId}`)
	revalidatePath('/newsroom')
	revalidatePath('/[locale]/newsroom', 'page')
	revalidatePath('/[locale]/newsroom/[slug]', 'page')
	if (articleId) { const { data } = await supabase.from('article_translations').select('locale, slug').eq('article_id', articleId); for (const item of data ?? []) { const prefix = item.locale === 'en' ? '' : `/${item.locale}`; revalidatePath(`${prefix}/newsroom/${item.slug}`) } }
}
export async function createArticleAction(_: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
	try {
		const details = articleDetailsFromForm(formData, false); const translation = articleTranslationFromForm(formData, false)
		if (translation.locale !== 'en') return { error: 'New articles must start with an English translation.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); const articleId = randomUUID(); await validateArticleInlineMedia(supabase, translation)
		const { data: article, error } = await supabase.from('articles').insert({ id: articleId, stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (error) return { error: `Could not create the article: ${error.message}` }
		await ensureArticleCanPublish(supabase, article.id, translation)
		const publication = articlePublication(translation.status, translation.scheduledFor)
		const { error: translationError } = await supabase.from('article_translations').insert({ article_id: article.id, locale: 'en', slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
		if (translationError) return { error: `The article was created, but its English translation could not be saved: ${translationError.message}` }
		await replaceArticleRelations(supabase, article.id, details); await saveArticleCoverAlt(supabase, article.id, 'en', translation.coverAltText); await refreshNewsroomPaths(supabase, article.id)
		return { success: 'Article created.', entryId: article.id }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the article.' } }
}
export async function saveArticleDetailsAction(_: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
	try { const details = articleDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('articles').update({ stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, updated_by: profile.id }).eq('id', details.articleId!); if (error) return { error: `Could not save article details: ${error.message}` }; await replaceArticleRelations(supabase, details.articleId!, details); await refreshNewsroomPaths(supabase, details.articleId!); return { success: 'Shared article details saved.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save article details.' } } }
export async function saveArticleTranslationAction(_: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
	try { const translation = articleTranslationFromForm(formData); await requireActiveStaff(); const supabase = await createClient(); await validateArticleInlineMedia(supabase, translation); await ensureArticleCanPublish(supabase, translation.articleId!, translation); const publication = articlePublication(translation.status, translation.scheduledFor); const { error } = await supabase.from('article_translations').upsert({ article_id: translation.articleId!, locale: translation.locale, slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'article_id,locale' }); if (error) return { error: `Could not save this translation: ${error.message}` }; await saveArticleCoverAlt(supabase, translation.articleId!, translation.locale, translation.coverAltText); await refreshNewsroomPaths(supabase, translation.articleId); return { success: `${translation.locale} translation saved.` } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save this translation.' } } }
export async function setArticleArchivedAction(_: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
	try { const articleId = z.string().uuid().parse(formData.get('articleId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('articles').update({ updated_by: profile.id }).eq('id', articleId); if (error) return { error: `Could not ${archive ? 'archive' : 'restore'} the article: ${error.message}` }; const { error: translationError } = archive ? await supabase.from('article_translations').update({ status: 'archived', scheduled_for: null, published_at: null }).eq('article_id', articleId) : { error: null }; if (translationError) return { error: `Could not archive article translations: ${translationError.message}` }; await refreshNewsroomPaths(supabase, articleId); return { success: archive ? 'Article and its translations archived.' : 'Article restored; save a translation to publish it again.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not update this article.' } } }
export async function attachArticleCoverAction(input: unknown): Promise<ArticleActionState> {
	try { const parsed = articleCoverSchema.parse(input); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: parsed.objectPath, original_filename: parsed.originalFilename, mime_type: parsed.mimeType, file_size_bytes: parsed.fileSizeBytes, width: parsed.width, height: parsed.height, uploaded_by: profile.id }).select('id').single(); if (mediaError) return { error: `The file uploaded, but its media record could not be created: ${mediaError.message}` }; const { error: altError } = await supabase.from('media_asset_translations').upsert({ media_asset_id: media.id, locale: 'en', alt_text: parsed.altText }, { onConflict: 'media_asset_id,locale' }); if (altError) return { error: `The cover uploaded, but its English alt text could not be saved: ${altError.message}` }; const { error } = await supabase.from('articles').update({ cover_media_id: media.id, updated_by: profile.id }).eq('id', parsed.articleId); if (error) return { error: `The cover was saved, but could not be attached: ${error.message}` }; await refreshNewsroomPaths(supabase, parsed.articleId); return { success: 'Cover image uploaded and attached.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not upload the cover image.' } } }

export async function createNewsroomTagAction(_: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
	try { const parsed = z.object({ stableKey: requiredKey, name: z.string().trim().min(1).max(160), slug: requiredKey, status: z.enum(['draft', 'published']) }).parse({ stableKey: formData.get('stableKey'), name: formData.get('name'), slug: formData.get('slug'), status: formData.get('status') }); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID(); const { data: tag, error } = await supabase.from('tags').insert({ id, stable_key: parsed.stableKey, created_by: profile.id, updated_by: profile.id }).select('id').single(); if (error) return { error: `Could not create tag: ${error.message}` }; const { error: translationError } = await supabase.from('tag_translations').insert({ tag_id: tag.id, locale: 'en', slug: parsed.slug, name: parsed.name, status: parsed.status, published_at: parsed.status === 'published' ? new Date().toISOString() : null }); if (translationError) return { error: `The tag was created, but its English label could not be saved: ${translationError.message}` }; revalidatePath('/admin/newsroom'); return { success: 'Newsroom tag created.' } } catch (error) { return { error: error instanceof Error ? error.message : 'Could not create newsroom tag.' } } }
