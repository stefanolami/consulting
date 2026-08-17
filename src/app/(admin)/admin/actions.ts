'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { parseProfileDocument } from '@/lib/team-profile-document'
import { parseCatalogueDocument } from '@/lib/catalogue-document'
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
