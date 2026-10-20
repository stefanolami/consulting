'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, documentField, failed, FieldError, jsonField, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { PUBLICATION_COLUMNS, publicationColumns, publishedNotice, type SavedPublication } from '@/lib/admin-publication'
import { countryServiceAssignmentSchema, countryServiceCopySchema, countryStatisticLabelSchema, countryStatisticSchema, httpUrl, optional, optionalEmail, optionalHttpUrl, optionalNumber, optionalText, optionalUuid, profileRoleSchema, requiredKey } from '@/lib/admin-schema.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { validationMessage } from '@/lib/rich-text-rules.mjs'
import { parseProfileDocument } from '@/lib/team-profile-document'
import { parseCatalogueDocument } from '@/lib/catalogue-document'
import { articleImageMediaIds, parseArticleDocument } from '@/lib/article-document'
import { PUBLIC_CATALOGUE_CACHE_TAG, PUBLIC_NEWSROOM_CACHE_TAG, PUBLIC_OUTREACH_CACHE_TAG, PUBLIC_TEAM_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'
import { editorialState, restoredStatus } from '@/lib/publication.mjs'
import { teamPath } from '@/lib/team-paths'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const

const sharedProfileFields = {
	displayName: z.string().trim().min(2).max(160),
	stableKey: requiredKey,
	email: optionalEmail(),
	phone: optionalText(80),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	teamGroup: z.enum(['managing_team', 'team']),
}
const sharedProfileSchema = z.object(sharedProfileFields)

const profileRolesSchema = z.array(profileRoleSchema).min(1, 'Add at least one role.').max(10)

const translationSchema = z.object({
	personId: z.string().uuid(),
	locale: z.enum(locales),
	slug: requiredKey,
	cardName: optionalText(160),
	roles: profileRolesSchema,
	profileDocument: z.unknown(),
	portraitAltText: optionalText(320),
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(['draft', 'scheduled', 'published', 'archived']),
})

const newProfileSchema = z.object({
	...sharedProfileFields,
	slug: requiredKey,
	cardName: optionalText(160),
	roles: profileRolesSchema,
	profileDocument: z.unknown(),
	portraitAltText: optionalText(320),
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(['draft', 'published']),
})

const peopleItemLabels = { roles: 'Role' }

const portraitSchema = z.object({
	personId: z.string().uuid(),
	objectPath: z.string().min(1).max(1024),
	originalFilename: z.string().min(1).max(512),
	mimeType: z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
	fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	altText: z.string().trim().min(3, 'Enter English alt text for the portrait (at least 3 characters).').max(320),
})

function cardRoles(roles: z.infer<typeof profileRolesSchema>) {
	if (roles.filter((role) => role.isCardRole).length !== 1) throw new FieldError('roles', 'Select exactly one role for the team card.')
	return roles.map((role, displayOrder) => ({ ...role, displayOrder }))
}

async function replaceRoles(
	supabase: Awaited<ReturnType<typeof createClient>>,
	personId: string,
	locale: (typeof locales)[number],
	roles: ReturnType<typeof cardRoles>,
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

export async function createPersonAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the profile.', async () => {
		const parsed = newProfileSchema.parse({
			displayName: formData.get('displayName'), stableKey: formData.get('stableKey'),
			email: formData.get('email'), phone: formData.get('phone'),
			displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'),
			slug: formData.get('slug'), cardName: formData.get('cardName'),
			roles: jsonField(formData, 'roles', 'Roles'), profileDocument: jsonField(formData, 'profileDocument', 'The profile document'),
			portraitAltText: formData.get('portraitAltText'), seoTitle: formData.get('seoTitle'),
			seoDescription: formData.get('seoDescription'), status: formData.get('status'),
		})
		const roles = cardRoles(parsed.roles)
		const profileDocument = documentField('profileDocument', () => parseProfileDocument(parsed.profileDocument))

		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: existingSlug, error: slugError } = await supabase.from('people_translations').select('person_id').eq('locale', 'en').eq('slug', parsed.slug).maybeSingle()
		if (slugError) return failed(`Could not validate the English URL slug: ${slugError.message}`)
		if (existingSlug) throw new FieldError('slug', 'That English URL slug is already in use.')

		const personId = randomUUID()
		const portraitFile = formData.get('portraitFile')
		let portraitMediaId: string | null = null
		if (portraitFile instanceof File && portraitFile.size > 0) {
			const mimeType = z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']).safeParse(portraitFile.type)
			if (!mimeType.success) throw new FieldError('portraitFile', 'Choose a GIF, JPEG, PNG, SVG, or WebP portrait.')
			if (portraitFile.size > 15 * 1024 * 1024) throw new FieldError('portraitFile', 'Portraits must be 15 MiB or smaller.')
			if (!parsed.portraitAltText || parsed.portraitAltText.length < 3) throw new FieldError('portraitAltText', 'Provide English alt text for the portrait.')
			const extension = mimeType.data === 'image/jpeg' ? 'jpg' : mimeType.data.split('/')[1]
			const objectPath = `people/${personId}/${randomUUID()}.${extension}`
			const { error: uploadError } = await supabase.storage.from('public-media').upload(objectPath, await portraitFile.arrayBuffer(), { cacheControl: '31536000', contentType: mimeType.data, upsert: false })
			if (uploadError) return failed(`Could not upload portrait: ${uploadError.message}`)
			const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: objectPath, original_filename: portraitFile.name, mime_type: mimeType.data, file_size_bytes: portraitFile.size, uploaded_by: profile.id }).select('id').single()
			if (mediaError) return failed(`The portrait uploaded, but its media record could not be created: ${mediaError.message}`)
			const { error: altError } = await supabase.from('media_asset_translations').insert({ media_asset_id: media.id, locale: 'en', alt_text: parsed.portraitAltText })
			if (altError) return failed(`The portrait uploaded, but its alt text could not be saved: ${altError.message}`)
			portraitMediaId = media.id
		}

		const { data: person, error: personError } = await supabase.from('people').insert({
			id: personId,
			display_name: parsed.displayName, stable_key: parsed.stableKey, email: parsed.email, phone: parsed.phone,
			display_order: parsed.displayOrder, team_group: parsed.teamGroup,
			portrait_media_id: portraitMediaId,
			is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on',
			created_by: profile.id, updated_by: profile.id,
		}).select('id').single()
		if (personError) return failed(`Could not create the profile: ${personError.message}`)

		const { row: publication } = publicationColumns({ existing: null, publishAt: null, status: parsed.status })
		const { error: translationError } = await supabase.from('people_translations').insert({
			person_id: person.id, locale: 'en', slug: parsed.slug, card_name: parsed.cardName,
			profile_document: profileDocument, seo_title: parsed.seoTitle,
			seo_description: parsed.seoDescription, ...publication,
		})
		if (translationError) return failed(`The shared profile was created, but the English translation could not be saved: ${translationError.message}`)
		await replaceRoles(supabase, person.id, 'en', roles)

		// A profile created as published is public at once.
		await refreshPersonPaths(supabase, person.id)
		return succeeded('Profile created.', undefined, { redirectTo: `/admin/people/${person.id}` })
	}, { itemLabels: peopleItemLabels })
}

export async function updatePersonAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the profile.', async () => {
		const parsed = sharedProfileSchema.parse({
			displayName: formData.get('displayName'), stableKey: formData.get('stableKey'), email: formData.get('email'),
			phone: formData.get('phone'), displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'),
		})
		const personId = z.string().uuid().parse(formData.get('personId'))
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from('people').update({
			display_name: parsed.displayName, stable_key: parsed.stableKey, email: parsed.email, phone: parsed.phone,
			display_order: parsed.displayOrder, team_group: parsed.teamGroup,
			is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on', updated_by: profile.id,
		}).eq('id', personId)
		if (error) return failed(`Could not save the profile: ${error.message}`)
		await refreshPersonPaths(supabase, personId)
		return succeeded('Profile details saved.')
	})
}

export async function savePersonTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save the translation.', async () => {
		const parsed = translationSchema.parse({
			personId: formData.get('personId'), locale: formData.get('locale'), slug: formData.get('slug'), cardName: formData.get('cardName'),
			roles: jsonField(formData, 'roles', 'Roles'), profileDocument: jsonField(formData, 'profileDocument', 'The profile document'),
			portraitAltText: formData.get('portraitAltText'), seoTitle: formData.get('seoTitle'),
			seoDescription: formData.get('seoDescription'), status: formData.get('status'),
		})
		const roles = cardRoles(parsed.roles)
		const profileDocument = documentField('profileDocument', () => parseProfileDocument(parsed.profileDocument))

		await requireActiveStaff()
		const supabase = await createClient()
		const { data: existing, error: existingError } = await supabase.from('people_translations').select(PUBLICATION_COLUMNS).eq('person_id', parsed.personId).eq('locale', parsed.locale).maybeSingle()
		if (existingError) return failed(`Could not load the translation: ${existingError.message}`)
		const { row: publication, saved } = publicationColumns({ existing, publishAt: formData.get('publishAt'), status: parsed.status })
		const { error } = await supabase.from('people_translations').upsert({
			person_id: parsed.personId, locale: parsed.locale, slug: parsed.slug, card_name: parsed.cardName,
			profile_document: profileDocument, seo_title: parsed.seoTitle, seo_description: parsed.seoDescription,
			...publication,
		}, { onConflict: 'person_id,locale' })
		if (error) return failed(`Could not save the translation: ${error.message}`)
		await replaceRoles(supabase, parsed.personId, parsed.locale, roles)

		if (parsed.portraitAltText) {
			const { data: person, error: portraitError } = await supabase.from('people').select('portrait_media_id').eq('id', parsed.personId).maybeSingle()
			if (portraitError) return failed(`The translation was saved, but the portrait details could not be loaded: ${portraitError.message}`)
			if (person?.portrait_media_id) {
				const { error: altError } = await supabase.from('media_asset_translations').upsert({ media_asset_id: person.portrait_media_id, locale: parsed.locale, alt_text: parsed.portraitAltText }, { onConflict: 'media_asset_id,locale' })
				if (altError) return failed(`The translation was saved, but the portrait alt text was not: ${altError.message}`)
			}
		}
		await refreshPersonPaths(supabase, parsed.personId)
		return succeeded(`${parsed.locale} translation saved${publishedNotice(saved)}.`, saved)
	}, { itemLabels: peopleItemLabels })
}

export async function setPersonArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update this profile.', async () => {
		const personId = z.string().uuid().parse(formData.get('personId'))
		const isArchived = formData.get('isArchived') === 'true'
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from('people').update({ is_active: !isArchived, updated_by: profile.id }).eq('id', personId)
		if (error) return failed(`Could not ${isArchived ? 'archive' : 'restore'} this profile: ${error.message}`)
		await refreshPersonPaths(supabase, personId)
		return succeeded(isArchived ? 'Profile archived.' : 'Profile restored.')
	})
}

export async function movePersonAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update the team order.', async () => {
		const personId = z.string().uuid().parse(formData.get('personId'))
		const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: current, error: currentError } = await supabase.from('people').select('team_group').eq('id', personId).maybeSingle()
		if (currentError || !current) return failed(`Could not load team group: ${currentError?.message ?? 'Profile not found.'}`)
		const { data: people, error: peopleError } = await supabase.from('people').select('id').eq('is_team_member', true).eq('team_group', current.team_group).order('display_order').order('display_name')
		if (peopleError) return failed(`Could not load team order: ${peopleError.message}`)
		const currentIndex = (people ?? []).findIndex((person) => person.id === personId)
		const destinationIndex = currentIndex + (direction === 'up' ? -1 : 1)
		if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= (people?.length ?? 0)) return succeeded('Team order is unchanged.')
		const orderedIds = (people ?? []).map((person) => person.id)
		;[orderedIds[currentIndex], orderedIds[destinationIndex]] = [orderedIds[destinationIndex], orderedIds[currentIndex]]
		const updates = await Promise.all(orderedIds.map((id, displayOrder) => supabase.from('people').update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
		const failedUpdate = updates.find((result) => result.error)
		if (failedUpdate?.error) return failed(`Could not save team order: ${failedUpdate.error.message}`)
		revalidatePath('/admin/people')
		updateTag(PUBLIC_TEAM_CACHE_TAG)
		revalidatePath(teamPath('en'))
		return succeeded('Team order saved.')
	})
}

export async function attachPersonPortraitAction(input: unknown): Promise<AdminActionResult<{ objectPath: string }>> {
	return adminAction('Could not attach the portrait.', async () => {
		const parsed = portraitSchema.parse(input)
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: media, error: mediaError } = await supabase.from('media_assets').insert({
			object_path: parsed.objectPath, original_filename: parsed.originalFilename, mime_type: parsed.mimeType,
			file_size_bytes: parsed.fileSizeBytes, width: parsed.width, height: parsed.height, uploaded_by: profile.id,
		}).select('id').single()
		if (mediaError) return failed(`The file uploaded, but its media record could not be created: ${mediaError.message}`)
		const { error: translationError } = await supabase.from('media_asset_translations').insert({ media_asset_id: media.id, locale: 'en', alt_text: parsed.altText })
		if (translationError) return failed(`The file uploaded, but its alt text could not be saved: ${translationError.message}`)
		const { error: personError } = await supabase.from('people').update({ portrait_media_id: media.id, updated_by: profile.id }).eq('id', parsed.personId)
		if (personError) return failed(`The media was created, but could not be attached: ${personError.message}`)
		await refreshPersonPaths(supabase, parsed.personId)
		return succeeded('Portrait uploaded and attached to this profile.', { objectPath: parsed.objectPath })
	})
}

async function refreshPersonPaths(supabase: Awaited<ReturnType<typeof createClient>>, personId: string) {
	updateTag(PUBLIC_CATALOGUE_CACHE_TAG)
	updateTag(PUBLIC_NEWSROOM_CACHE_TAG)
	updateTag(PUBLIC_OUTREACH_CACHE_TAG)
	updateTag(PUBLIC_TEAM_CACHE_TAG)
	revalidatePath('/admin')
	revalidatePath('/admin/people')
	revalidatePath(`/admin/people/${personId}`)
	for (const locale of locales) revalidatePath(teamPath(locale))
	const { data: translations } = await supabase.from('people_translations').select('locale, slug').eq('person_id', personId)
	for (const translation of translations ?? []) {
		if (locales.includes(translation.locale as (typeof locales)[number])) revalidatePath(teamPath(translation.locale as (typeof locales)[number], translation.slug))
	}
}

export type CatalogueKind = 'services' | 'sectors'

const catalogueKinds = ['services', 'sectors'] as const
const catalogueStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const catalogueDetailsSchema = z.object({
	kind: z.enum(catalogueKinds),
	entryId: optionalUuid,
	stableKey: requiredKey,
	displayOrder: z.coerce.number().int().min(0).max(100_000),
	iconMediaId: optionalUuid,
	contactIds: z.array(z.string().uuid()).max(30),
	articleIds: z.array(z.string().uuid()).max(100),
})
const catalogueTranslationSchema = z.object({
	kind: z.enum(catalogueKinds),
	entryId: optionalUuid,
	locale: z.enum(locales),
	slug: requiredKey,
	name: z.string().trim().min(1, 'Enter a localized name.').max(160),
	summary: optionalText(2_000),
	content: z.unknown(),
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(catalogueStatuses),
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
	altText: z.string().trim().min(3, 'Enter English alt text for the icon (at least 3 characters).').max(320),
})

function detailsFromForm(formData: FormData, includeEntryId = true) {
	return catalogueDetailsSchema.parse({
		kind: formData.get('kind'),
		entryId: includeEntryId ? formData.get('entryId') : undefined,
		stableKey: formData.get('stableKey'),
		displayOrder: formData.get('displayOrder'),
		iconMediaId: formData.get('iconMediaId'),
		contactIds: jsonField(formData, 'contactIds', 'Contacts'),
		articleIds: jsonField(formData, 'articleIds', 'Related articles'),
	})
}

function translationFromForm(formData: FormData) {
	const parsed = catalogueTranslationSchema.parse({
		kind: formData.get('kind'), entryId: formData.get('entryId'), locale: formData.get('locale'), slug: formData.get('slug'),
		name: formData.get('name'), summary: formData.get('summary'), content: jsonField(formData, 'content', 'The content'),
		seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'),
		status: formData.get('status'), iconAltText: formData.get('iconAltText'),
	})
	return { ...parsed, content: documentField('content', () => parseCatalogueDocument(parsed.content)), publishAt: formData.get('publishAt') }
}

function uniqueIds(ids: string[], label: string, field?: string) {
	if (new Set(ids).size !== ids.length) {
		const message = `${label} cannot contain duplicates.`
		throw field ? new FieldError(field, message) : new Error(message)
	}
	return ids
}

async function replaceCatalogueRelations(
	supabase: Awaited<ReturnType<typeof createClient>>,
	kind: CatalogueKind,
	entryId: string,
	contactIds: string[],
	articleIds: string[],
) {
	uniqueIds(contactIds, 'Contacts', 'contactIds')
	uniqueIds(articleIds, 'Related articles', 'articleIds')

	if (contactIds.length) {
		const { data: contacts, error } = await supabase.from('people').select('id').eq('is_active', true).eq('is_team_member', true).in('id', contactIds)
		if (error) throw new Error(`Could not validate team contacts: ${error.message}`)
		if ((contacts ?? []).length !== contactIds.length) throw new FieldError('contactIds', 'Every contact must be an active team member.')
	}
	if (articleIds.length) {
		const { data: articles, error } = await supabase.from('articles').select('id').in('id', articleIds)
		if (error) throw new Error(`Could not validate related articles: ${error.message}`)
		if ((articles ?? []).length !== articleIds.length) throw new FieldError('articleIds', 'One or more related articles no longer exist.')
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
	updateTag(PUBLIC_CATALOGUE_CACHE_TAG)
	updateTag(PUBLIC_NEWSROOM_CACHE_TAG)
	if (kind === 'services') updateTag(PUBLIC_OUTREACH_CACHE_TAG)
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

export async function createCatalogueAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the catalogue entry.', async () => {
		const details = detailsFromForm(formData, false)
		const translation = translationFromForm(formData)
		if (translation.locale !== 'en') return failed('New catalogue entries must start with an English translation.')
		const { goesPublic, row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && details.iconMediaId && !translation.iconAltText) throw new FieldError('iconAltText', 'Published English content needs localized alt text for its selected icon.')
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const entryId = randomUUID()
		const table = details.kind
		const { data: entry, error: createError } = await supabase.from(table).insert({ id: entryId, stable_key: details.stableKey, display_order: details.displayOrder, icon_media_id: details.iconMediaId, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (createError) return failed(`Could not create the ${details.kind.slice(0, -1)}: ${createError.message}`)
		const { error: translationError } = details.kind === 'services'
			? await supabase.from('service_translations').insert({ service_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
			: await supabase.from('sector_translations').insert({ sector_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
		if (translationError) return failed(`The catalogue entry was created, but its English translation could not be saved: ${translationError.message}`)
		await replaceCatalogueRelations(supabase, details.kind, entry.id, details.contactIds, details.articleIds)
		if (translation.iconAltText && details.iconMediaId) await saveCatalogueIconAlt(supabase, details.iconMediaId, 'en', translation.iconAltText)
		await refreshCataloguePaths(supabase, details.kind, entry.id)
		return succeeded('Catalogue entry created.', undefined, { redirectTo: `/admin/catalogue/${details.kind}/${entry.id}` })
	})
}

export async function saveCatalogueDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save catalogue details.', async () => {
		const details = detailsFromForm(formData)
		if (!details.entryId) return failed('Invalid catalogue entry.')
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from(details.kind).update({ stable_key: details.stableKey, display_order: details.displayOrder, icon_media_id: details.iconMediaId, updated_by: profile.id }).eq('id', details.entryId)
		if (error) return failed(`Could not save catalogue details: ${error.message}`)
		await replaceCatalogueRelations(supabase, details.kind, details.entryId, details.contactIds, details.articleIds)
		await refreshCataloguePaths(supabase, details.kind, details.entryId)
		return succeeded('Shared catalogue details saved.')
	})
}

export async function saveCatalogueTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this translation.', async () => {
		const translation = translationFromForm(formData)
		if (!translation.entryId) return failed('Invalid catalogue entry.')
		await requireActiveStaff()
		const supabase = await createClient()
		const { data: catalogueEntry, error: catalogueEntryError } = await supabase.from(translation.kind).select('icon_media_id').eq('id', translation.entryId).maybeSingle()
		if (catalogueEntryError || !catalogueEntry) return failed(`Could not load this catalogue entry: ${catalogueEntryError?.message ?? 'Entry not found.'}`)
		const { data: existing, error: existingError } = translation.kind === 'services'
			? await supabase.from('service_translations').select(PUBLICATION_COLUMNS).eq('service_id', translation.entryId).eq('locale', translation.locale).maybeSingle()
			: await supabase.from('sector_translations').select(PUBLICATION_COLUMNS).eq('sector_id', translation.entryId).eq('locale', translation.locale).maybeSingle()
		if (existingError) return failed(`Could not load this translation: ${existingError.message}`)
		const { goesPublic, row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && catalogueEntry.icon_media_id && !translation.iconAltText) throw new FieldError('iconAltText', 'Published localized content needs localized alt text for its selected icon.')
		const { error } = translation.kind === 'services'
			? await supabase.from('service_translations').upsert({ service_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'service_id,locale' })
			: await supabase.from('sector_translations').upsert({ sector_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'sector_id,locale' })
		if (error) return failed(`Could not save this translation: ${error.message}`)
		if (translation.iconAltText) {
			if (catalogueEntry.icon_media_id) await saveCatalogueIconAlt(supabase, catalogueEntry.icon_media_id, translation.locale, translation.iconAltText)
		}
		await refreshCataloguePaths(supabase, translation.kind, translation.entryId)
		return succeeded(`${translation.locale} translation saved${publishedNotice(saved)}.`, saved)
	})
}

async function saveCatalogueIconAlt(supabase: Awaited<ReturnType<typeof createClient>>, mediaId: string, locale: (typeof locales)[number], altText: string) {
	const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: mediaId, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' })
	if (error) throw new Error(`Could not save localized icon alt text: ${error.message}`)
}

export async function attachCatalogueIconAction(input: unknown): Promise<AdminActionResult<{ mediaId: string }>> {
	return adminAction('Could not upload the icon.', async () => {
		const parsed = catalogueIconSchema.parse(input)
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: parsed.objectPath, original_filename: parsed.originalFilename, mime_type: parsed.mimeType, file_size_bytes: parsed.fileSizeBytes, width: parsed.width, height: parsed.height, uploaded_by: profile.id }).select('id').single()
		if (mediaError) return failed(`The file uploaded, but its media record could not be created: ${mediaError.message}`)
		await saveCatalogueIconAlt(supabase, media.id, 'en', parsed.altText)
		const { error: attachError } = await supabase.from(parsed.kind).update({ icon_media_id: media.id, updated_by: profile.id }).eq('id', parsed.entryId)
		if (attachError) return failed(`The icon was saved, but could not be attached: ${attachError.message}`)
		await refreshCataloguePaths(supabase, parsed.kind, parsed.entryId)
		return succeeded('Icon uploaded and attached.', { mediaId: media.id })
	})
}

export async function setCatalogueArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update this catalogue entry.', async () => {
		const kind = z.enum(catalogueKinds).parse(formData.get('kind'))
		const entryId = z.string().uuid().parse(formData.get('entryId'))
		const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { error } = await supabase.from(kind).update({ is_active: !archive, updated_by: profile.id }).eq('id', entryId)
		if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} this catalogue entry: ${error.message}`)
		await refreshCataloguePaths(supabase, kind, entryId)
		return succeeded(archive ? 'Catalogue entry archived.' : 'Catalogue entry restored.')
	})
}

export async function moveCatalogueAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update catalogue order.', async () => {
		const kind = z.enum(catalogueKinds).parse(formData.get('kind'))
		const entryId = z.string().uuid().parse(formData.get('entryId'))
		const direction = z.enum(['up', 'down']).parse(formData.get('direction'))
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: entries, error } = await supabase.from(kind).select('id').eq('is_active', true).order('display_order').order('stable_key')
		if (error) return failed(`Could not load catalogue order: ${error.message}`)
		const current = (entries ?? []).findIndex((entry) => entry.id === entryId)
		const destination = current + (direction === 'up' ? -1 : 1)
		if (current < 0 || destination < 0 || destination >= (entries?.length ?? 0)) return succeeded('Catalogue order is unchanged.')
		const ids = (entries ?? []).map((entry) => entry.id)
		;[ids[current], ids[destination]] = [ids[destination], ids[current]]
		const results = await Promise.all(ids.map((id, displayOrder) => supabase.from(kind).update({ display_order: displayOrder, updated_by: profile.id }).eq('id', id)))
		const failedResult = results.find((result) => result.error)
		if (failedResult?.error) return failed(`Could not save catalogue order: ${failedResult.error.message}`)
		await refreshCataloguePaths(supabase, kind)
		return succeeded('Catalogue order saved.')
	})
}

const outreachStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const isoCountryCode = z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use a two-letter ISO 3166-1 alpha-2 country code.').transform((value) => value.toUpperCase())
const outreachMapConfig = z.object({
	mapLongitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -180 && value <= 180), 'Map longitude must be between -180 and 180.'),
	mapLatitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -90 && value <= 90), 'Map latitude must be between -90 and 90.'),
	mapZoom: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value > 0 && value <= 10), 'Map zoom must be greater than 0 and no more than 10.'),
})
const outreachItemLabels = { serviceAssignments: 'Service', statistics: 'Statistic', serviceCopies: 'Service copy', statisticLabels: 'Statistic label', expertIds: 'Expert', officeIds: 'Office' }

function mapConfigFromForm(formData: FormData) {
	const parsed = outreachMapConfig.parse({ mapLongitude: formData.get('mapLongitude'), mapLatitude: formData.get('mapLatitude'), mapZoom: formData.get('mapZoom') })
	if ((parsed.mapLongitude === null) !== (parsed.mapLatitude === null)) throw new FieldError(parsed.mapLongitude === null ? 'mapLongitude' : 'mapLatitude', 'Provide both map longitude and latitude, or leave both empty.')
	if (parsed.mapZoom !== null && parsed.mapLongitude === null) throw new FieldError('mapZoom', 'Map zoom requires a map longitude and latitude.')
	return parsed.mapLongitude === null ? {} : { coordinates: [parsed.mapLongitude, parsed.mapLatitude], ...(parsed.mapZoom === null ? {} : { zoom: parsed.mapZoom }) }
}

async function refreshOutreachPaths(supabase: Awaited<ReturnType<typeof createClient>>, countryCode?: string) {
	updateTag(PUBLIC_OUTREACH_CACHE_TAG)
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

const regionDetailsSchema = z.object({ regionId: optionalUuid, stableKey: requiredKey, displayOrder: z.coerce.number().int().min(0).max(100_000) })
const regionTranslationSchema = z.object({ regionId: optionalUuid, locale: z.enum(locales), slug: requiredKey, name: z.string().trim().min(1).max(160), status: z.enum(outreachStatuses) })

function regionDetailsFromForm(formData: FormData, includeId = true) {
	return { ...regionDetailsSchema.parse({ regionId: includeId ? formData.get('regionId') : undefined, stableKey: formData.get('stableKey'), displayOrder: formData.get('displayOrder') }), mapConfig: mapConfigFromForm(formData) }
}
function regionTranslationFromForm(formData: FormData, includeId = true) {
	const parsed = regionTranslationSchema.parse({ regionId: includeId ? formData.get('regionId') : undefined, locale: formData.get('locale'), slug: formData.get('slug'), name: formData.get('name'), status: formData.get('status') })
	return { ...parsed, publishAt: formData.get('publishAt') }
}

export async function createRegionAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the region.', async () => {
		const details = regionDetailsFromForm(formData, false); const translation = regionTranslationFromForm(formData, false)
		if (translation.locale !== 'en') return failed('New regions must start with an English translation.')
		const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID()
		const { error: regionError } = await supabase.from('regions').insert({ id, stable_key: details.stableKey, display_order: details.displayOrder, map_config: details.mapConfig, created_by: profile.id, updated_by: profile.id })
		if (regionError) return failed(`Could not create the region: ${regionError.message}`)
		const { error: translationError } = await supabase.from('region_translations').insert({ region_id: id, locale: 'en', slug: translation.slug, name: translation.name, ...publication })
		if (translationError) return failed(`The region was created, but its English translation could not be saved: ${translationError.message}`)
		await refreshOutreachPaths(supabase); return succeeded('Region created.', undefined, { redirectTo: `/admin/outreach/regions/${id}` })
	})
}

export async function saveRegionDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save region details.', async () => {
		const details = regionDetailsFromForm(formData); if (!details.regionId) return failed('Invalid region.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('regions').update({ stable_key: details.stableKey, display_order: details.displayOrder, map_config: details.mapConfig, updated_by: profile.id }).eq('id', details.regionId)
		if (error) return failed(`Could not save region details: ${error.message}`); await refreshOutreachPaths(supabase); return succeeded('Region details saved.')
	})
}

export async function saveRegionTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this region translation.', async () => {
		const translation = regionTranslationFromForm(formData); if (!translation.regionId) return failed('Invalid region.')
		await requireActiveStaff(); const supabase = await createClient()
		const { data: existing, error: existingError } = await supabase.from('region_translations').select(PUBLICATION_COLUMNS).eq('region_id', translation.regionId).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this region translation: ${existingError.message}`)
		const { row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		const { error } = await supabase.from('region_translations').upsert({ region_id: translation.regionId, locale: translation.locale, slug: translation.slug, name: translation.name, ...publication }, { onConflict: 'region_id,locale' })
		if (error) return failed(`Could not save this region translation: ${error.message}`); await refreshOutreachPaths(supabase); return succeeded(`${translation.locale} translation saved${publishedNotice(saved)}.`, saved)
	})
}

export async function setRegionArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update this region.', async () => {
		const regionId = z.string().uuid().parse(formData.get('regionId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('regions').update({ is_active: !archive, updated_by: profile.id }).eq('id', regionId)
		if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} this region: ${error.message}`); await refreshOutreachPaths(supabase); return succeeded(archive ? 'Region archived.' : 'Region restored.')
	})
}

const countryDetailsSchema = z.object({
	countryCode: isoCountryCode, regionId: optionalUuid, isCovered: z.boolean(), displayOrder: z.coerce.number().int().min(0).max(100_000), lastReviewedOn: optionalText(10).refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use a valid review date.'), flagMediaId: optionalUuid, outlineMediaId: optionalUuid,
	serviceAssignments: z.array(countryServiceAssignmentSchema).max(100), expertIds: z.array(z.string().uuid()).max(50), officeIds: z.array(z.string().uuid()).max(100),
	statistics: z.array(countryStatisticSchema).max(100),
})
const countryTranslationSchema = z.object({ countryCode: isoCountryCode, locale: z.enum(locales), slug: requiredKey, name: z.string().trim().min(1).max(160), summary: optionalText(2_000), coverageSummary: optionalText(2_000), content: z.unknown(), seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(outreachStatuses), flagAltText: optionalText(320), outlineAltText: optionalText(320), serviceCopies: z.array(countryServiceCopySchema).max(100), statisticLabels: z.array(countryStatisticLabelSchema).max(100) })

function countryDetailsFromForm(formData: FormData) {
	const parsed = countryDetailsSchema.parse({ countryCode: formData.get('countryCode'), regionId: formData.get('regionId'), isCovered: formData.get('isCovered') === 'on', displayOrder: formData.get('displayOrder'), lastReviewedOn: formData.get('lastReviewedOn'), flagMediaId: formData.get('flagMediaId'), outlineMediaId: formData.get('outlineMediaId'), serviceAssignments: jsonField(formData, 'serviceAssignments', 'Country services'), expertIds: jsonField(formData, 'expertIds', 'Country experts'), officeIds: jsonField(formData, 'officeIds', 'Country offices'), statistics: jsonField(formData, 'statistics', 'Statistics') })
	uniqueIds(parsed.serviceAssignments.map((item) => item.serviceId), 'Country services', 'serviceAssignments'); uniqueIds(parsed.expertIds, 'Country experts', 'expertIds'); uniqueIds(parsed.officeIds, 'Country offices', 'officeIds'); uniqueIds(parsed.statistics.map((item) => item.metricKey), 'Statistic metric keys', 'statistics')
	return { ...parsed, mapConfig: mapConfigFromForm(formData) }
}
function countryTranslationFromForm(formData: FormData) {
	const parsed = countryTranslationSchema.parse({ countryCode: formData.get('countryCode'), locale: formData.get('locale'), slug: formData.get('slug'), name: formData.get('name'), summary: formData.get('summary'), coverageSummary: formData.get('coverageSummary'), content: jsonField(formData, 'content', 'The country content'), seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'), status: formData.get('status'), flagAltText: formData.get('flagAltText'), outlineAltText: formData.get('outlineAltText'), serviceCopies: jsonField(formData, 'serviceCopies', 'Country service copy'), statisticLabels: jsonField(formData, 'statisticLabels', 'Statistic labels') })
	return { ...parsed, content: documentField('content', () => parseCatalogueDocument(parsed.content)), serviceCopies: parsed.serviceCopies.map((copy, index) => ({ ...copy, content: documentField('serviceCopies', () => { try { return parseCatalogueDocument(copy.content) } catch (error) { throw new Error(`Service copy ${index + 1}: ${validationMessage(error)}`) } }) })), publishAt: formData.get('publishAt') }
}

async function replaceCountryRelations(supabase: Awaited<ReturnType<typeof createClient>>, details: ReturnType<typeof countryDetailsFromForm>) {
	if (details.serviceAssignments.length) { const { data, error } = await supabase.from('services').select('id').eq('is_active', true).in('id', details.serviceAssignments.map((item) => item.serviceId)); if (error) throw new Error(`Could not validate country services: ${error.message}`); if ((data ?? []).length !== details.serviceAssignments.length) throw new FieldError('serviceAssignments', 'Every assigned service must be active.') }
	if (details.expertIds.length) { const { data, error } = await supabase.from('people').select('id').eq('is_active', true).in('id', details.expertIds); if (error) throw new Error(`Could not validate country experts: ${error.message}`); if ((data ?? []).length !== details.expertIds.length) throw new FieldError('expertIds', 'Every country expert must be active.') }
	if (details.officeIds.length) { const { data, error } = await supabase.from('offices').select('id').eq('is_active', true).in('id', details.officeIds); if (error) throw new Error(`Could not validate country offices: ${error.message}`); if ((data ?? []).length !== details.officeIds.length) throw new FieldError('officeIds', 'Every assigned office must be active.') }
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

export async function createCountryAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the country.', async () => {
		const details = countryDetailsFromForm(formData); const translation = countryTranslationFromForm(formData); if (translation.locale !== 'en') return failed('New countries must start with an English translation.')
		const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error: countryError } = await supabase.from('countries').insert({ code: details.countryCode, region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, created_by: profile.id, updated_by: profile.id })
		if (countryError) return failed(`Could not create the country: ${countryError.message}`)
		const { error: translationError } = await supabase.from('country_translations').insert({ country_code: details.countryCode, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
		if (translationError) return failed(`The country was created, but its English translation could not be saved: ${translationError.message}`)
		await replaceCountryRelations(supabase, details); await saveCountryMediaAlts(supabase, details.countryCode, 'en', translation.flagAltText, translation.outlineAltText); await refreshOutreachPaths(supabase, details.countryCode)
		return succeeded('Country created.', undefined, { redirectTo: `/admin/outreach/${details.countryCode}` })
	}, { itemLabels: outreachItemLabels })
}

export async function saveCountryDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save country details.', async () => {
		const details = countryDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('countries').update({ region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, updated_by: profile.id }).eq('code', details.countryCode)
		if (error) return failed(`Could not save country details: ${error.message}`); await replaceCountryRelations(supabase, details); await refreshOutreachPaths(supabase, details.countryCode); return succeeded('Country identity, coverage, ordering, and relations saved.')
	}, { itemLabels: outreachItemLabels })
}

export async function saveCountryTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this country translation.', async () => {
		const translation = countryTranslationFromForm(formData); const supabase = await createClient(); await requireActiveStaff()
		const { data: country, error: countryError } = await supabase.from('countries').select('flag_media_id, outline_media_id').eq('code', translation.countryCode).maybeSingle(); if (countryError || !country) return failed(`Could not load country details: ${countryError?.message ?? 'Country not found.'}`)
		const { data: existing, error: existingError } = await supabase.from('country_translations').select(PUBLICATION_COLUMNS).eq('country_code', translation.countryCode).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this country translation: ${existingError.message}`)
		const { goesPublic, row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && country.flag_media_id && !translation.flagAltText) throw new FieldError('flagAltText', 'Published localized country content needs alt text for each selected media asset.')
		if (goesPublic && country.outline_media_id && !translation.outlineAltText) throw new FieldError('outlineAltText', 'Published localized country content needs alt text for each selected media asset.')
		const { error } = await supabase.from('country_translations').upsert({ country_code: translation.countryCode, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'country_code,locale' })
		if (error) return failed(`Could not save this country translation: ${error.message}`)
		const { data: assignments, error: assignmentError } = await supabase.from('country_services').select('service_id').eq('country_code', translation.countryCode); if (assignmentError) return failed(`Could not validate country services: ${assignmentError.message}`)
		const assigned = new Set((assignments ?? []).map((item) => item.service_id)); if (translation.serviceCopies.some((item) => !assigned.has(item.serviceId))) throw new FieldError('serviceCopies', 'Country service copy can only be saved for assigned services. Save the shared details first.')
		const { error: deleteCopiesError } = await supabase.from('country_service_translations').delete().eq('country_code', translation.countryCode).eq('locale', translation.locale); if (deleteCopiesError) return failed(`Could not update country service copy: ${deleteCopiesError.message}`)
		if (translation.serviceCopies.length) { const { error: copiesError } = await supabase.from('country_service_translations').insert(translation.serviceCopies.map((item) => ({ country_code: translation.countryCode, service_id: item.serviceId, locale: translation.locale, summary: item.summary, content: item.content }))); if (copiesError) return failed(`Could not save country service copy: ${copiesError.message}`) }
		if (translation.statisticLabels.length) { const { data: statistics, error: statisticsError } = await supabase.from('country_statistics').select('id').eq('country_code', translation.countryCode); if (statisticsError) return failed(`Could not validate statistics: ${statisticsError.message}`); const statisticIds = new Set((statistics ?? []).map((item) => item.id)); if (translation.statisticLabels.some((item) => !statisticIds.has(item.statisticId))) throw new FieldError('statisticLabels', 'Statistic labels must belong to this country.'); const { error: labelsError } = await supabase.from('country_statistic_translations').upsert(translation.statisticLabels.map((item) => ({ statistic_id: item.statisticId, locale: translation.locale, label: item.label, display_value: item.displayValue })), { onConflict: 'statistic_id,locale' }); if (labelsError) return failed(`Could not save statistic labels: ${labelsError.message}`) }
		await saveCountryMediaAlts(supabase, translation.countryCode, translation.locale, translation.flagAltText, translation.outlineAltText); await refreshOutreachPaths(supabase, translation.countryCode); return succeeded(`${translation.locale} country content saved${publishedNotice(saved)}.`, saved)
	}, { itemLabels: outreachItemLabels })
}

const officeDetailsSchema = z.object({ officeId: optionalUuid, stableKey: requiredKey, countryCode: optional(isoCountryCode), email: optionalEmail(), phone: optionalText(80), latitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -90 && value <= 90), 'Latitude must be between -90 and 90.'), longitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -180 && value <= 180), 'Longitude must be between -180 and 180.'), displayOrder: z.coerce.number().int().min(0).max(100_000) })
const officeTranslationSchema = z.object({ officeId: optionalUuid, locale: z.enum(locales), name: z.string().trim().min(1).max(160), city: optionalText(160), address: optionalText(2_000), status: z.enum(outreachStatuses) })
function officeDetailsFromForm(formData: FormData, includeId = true) { return officeDetailsSchema.parse({ officeId: includeId ? formData.get('officeId') : undefined, stableKey: formData.get('stableKey'), countryCode: formData.get('countryCode'), email: formData.get('email'), phone: formData.get('phone'), latitude: formData.get('latitude'), longitude: formData.get('longitude'), displayOrder: formData.get('displayOrder') }) }
function officeTranslationFromForm(formData: FormData, includeId = true) { const parsed = officeTranslationSchema.parse({ officeId: includeId ? formData.get('officeId') : undefined, locale: formData.get('locale'), name: formData.get('name'), city: formData.get('city'), address: formData.get('address'), status: formData.get('status') }); return { ...parsed, publishAt: formData.get('publishAt') } }
async function refreshOfficePaths(supabase: Awaited<ReturnType<typeof createClient>>, countryCode?: string) { await refreshOutreachPaths(supabase, countryCode) }
export async function createOfficeAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not create the office.', async () => { const details = officeDetailsFromForm(formData, false); const translation = officeTranslationFromForm(formData, false); if (translation.locale !== 'en') return failed('New offices must start with an English translation.'); const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status }); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID(); const { error: officeError } = await supabase.from('offices').insert({ id, stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: details.displayOrder, created_by: profile.id, updated_by: profile.id }); if (officeError) return failed(`Could not create the office: ${officeError.message}`); const { error: translationError } = await supabase.from('office_translations').insert({ office_id: id, locale: 'en', name: translation.name, city: translation.city, address: translation.address, ...publication }); if (translationError) return failed(`The office was created, but its English translation could not be saved: ${translationError.message}`); await refreshOfficePaths(supabase, details.countryCode ?? undefined); return succeeded('Office created.', undefined, { redirectTo: `/admin/outreach/offices/${id}` }) }) }
export async function saveOfficeDetailsAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not save office details.', async () => { const details = officeDetailsFromForm(formData); if (!details.officeId) return failed('Invalid office.'); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.officeId); if (error) return failed(`Could not save office details: ${error.message}`); await refreshOfficePaths(supabase, details.countryCode ?? undefined); return succeeded('Office details saved.') }) }
export async function saveOfficeTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> { return adminAction('Could not save this office translation.', async () => { const translation = officeTranslationFromForm(formData); if (!translation.officeId) return failed('Invalid office.'); await requireActiveStaff(); const supabase = await createClient(); const { data: existing, error: existingError } = await supabase.from('office_translations').select(PUBLICATION_COLUMNS).eq('office_id', translation.officeId).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this office translation: ${existingError.message}`); const { row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status }); const { error } = await supabase.from('office_translations').upsert({ office_id: translation.officeId, locale: translation.locale, name: translation.name, city: translation.city, address: translation.address, ...publication }, { onConflict: 'office_id,locale' }); if (error) return failed(`Could not save this office translation: ${error.message}`); await refreshOfficePaths(supabase); return succeeded(`${translation.locale} office content saved${publishedNotice(saved)}.`, saved) }) }
export async function setOfficeArchivedAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not update this office.', async () => { const officeId = z.string().uuid().parse(formData.get('officeId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ is_active: !archive, updated_by: profile.id }).eq('id', officeId); if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} this office: ${error.message}`); await refreshOfficePaths(supabase); return succeeded(archive ? 'Office archived.' : 'Office restored.') }) }

const articleStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const articleDetailsSchema = z.object({
	articleId: optionalUuid,
	stableKey: requiredKey,
	kind: z.string().trim().regex(/^[a-z][a-z0-9-]*$/, 'Article kind must use lowercase letters, numbers and hyphens.').max(80),
	coverMediaId: optionalUuid,
	externalMediaUrl: optionalHttpUrl('Enter a complete external media URL.'),
	isFeatured: z.boolean(),
	featuredOrder: z.coerce.number().int().min(0).max(100_000),
	authorIds: z.array(z.string().uuid()).max(30),
	tagIds: z.array(z.string().uuid()).max(100),
	serviceIds: z.array(z.string().uuid()).max(100),
	sectorIds: z.array(z.string().uuid()).max(100),
	relatedArticleIds: z.array(z.string().uuid()).max(100),
})
const articleTranslationSchema = z.object({
	articleId: optionalUuid, locale: z.enum(locales), slug: requiredKey,
	title: z.string().trim().min(2).max(300), excerpt: optionalText(2_000), content: z.unknown(),
	sources: z.array(z.object({ label: z.string().trim().min(1).max(300), url: httpUrl() }).strict()).max(50),
	seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(articleStatuses),
	coverAltText: optionalText(320),
})
const articleCoverSchema = z.object({
	articleId: z.string().uuid(), objectPath: z.string().min(1).max(1024), originalFilename: z.string().min(1).max(512),
	mimeType: z.enum(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']), fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
	width: z.number().int().positive().nullable(), height: z.number().int().positive().nullable(), altText: z.string().trim().min(3, 'Enter English alt text for the cover (at least 3 characters).').max(320),
})
const articleItemLabels = { sources: 'Source', authorIds: 'Author', tagIds: 'Tag', serviceIds: 'Service', sectorIds: 'Sector', relatedArticleIds: 'Related article' }

function articleDetailsFromForm(formData: FormData, requireId = true) {
	const parsed = articleDetailsSchema.parse({ articleId: formData.get('articleId'), stableKey: formData.get('stableKey'), kind: formData.get('kind'), coverMediaId: formData.get('coverMediaId'), externalMediaUrl: formData.get('externalMediaUrl'), isFeatured: formData.get('isFeatured') === 'on', featuredOrder: formData.get('featuredOrder'), authorIds: jsonField(formData, 'authorIds', 'Authors'), tagIds: jsonField(formData, 'tagIds', 'Tags'), serviceIds: jsonField(formData, 'serviceIds', 'Services'), sectorIds: jsonField(formData, 'sectorIds', 'Sectors'), relatedArticleIds: jsonField(formData, 'relatedArticleIds', 'Related articles') })
	if (requireId && !parsed.articleId) throw new Error('Enter valid article details.')
	for (const [ids, label, field] of [[parsed.authorIds, 'Authors', 'authorIds'], [parsed.tagIds, 'Tags', 'tagIds'], [parsed.serviceIds, 'Services', 'serviceIds'], [parsed.sectorIds, 'Sectors', 'sectorIds'], [parsed.relatedArticleIds, 'Related articles', 'relatedArticleIds']] as const) uniqueIds(ids, label, field)
	if (parsed.relatedArticleIds.includes(parsed.articleId ?? '')) throw new FieldError('relatedArticleIds', 'An article cannot be related to itself.')
	return parsed
}
function articleTranslationFromForm(formData: FormData, requireId = true) {
	const parsed = articleTranslationSchema.parse({ articleId: formData.get('articleId'), locale: formData.get('locale'), slug: formData.get('slug'), title: formData.get('title'), excerpt: formData.get('excerpt'), content: jsonField(formData, 'content', 'The article content'), sources: jsonField(formData, 'sources', 'Sources'), seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'), status: formData.get('status'), coverAltText: formData.get('coverAltText') })
	if (requireId && !parsed.articleId) throw new Error('Enter valid localized article content.')
	return { ...parsed, content: documentField('content', () => parseArticleDocument(parsed.content)), publishAt: formData.get('publishAt') }
}
const relationFields = { people: 'authorIds', tags: 'tagIds', services: 'serviceIds', sectors: 'sectorIds', articles: 'relatedArticleIds' } as const
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
	if ((data ?? []).length !== ids.length) throw new FieldError(relationFields[table], `One or more selected ${label.toLowerCase()} are unavailable. Refresh and try again.`)
}
async function replaceArticleRelations(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, details: ReturnType<typeof articleDetailsFromForm>) {
	await Promise.all([
		validateRelationIds(supabase, 'people', details.authorIds, 'authors'), validateRelationIds(supabase, 'tags', details.tagIds, 'tags'), validateRelationIds(supabase, 'services', details.serviceIds, 'services'), validateRelationIds(supabase, 'sectors', details.sectorIds, 'sectors'), validateRelationIds(supabase, 'articles', details.relatedArticleIds, 'related articles'),
	])
	const deletes = await Promise.all([
		supabase.from('article_authors').delete().eq('article_id', articleId), supabase.from('article_tags').delete().eq('article_id', articleId), supabase.from('article_services').delete().eq('article_id', articleId), supabase.from('article_sectors').delete().eq('article_id', articleId), supabase.from('article_relations').delete().eq('source_article_id', articleId),
	])
	const failedDelete = deletes.find((result) => result.error)
	if (failedDelete?.error) throw new Error(`Could not replace article relations: ${failedDelete.error.message}`)
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
// Published and scheduled translations need a cover (or external media) and
// its localized alt text.
async function ensureArticleCanPublish(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, translation: ReturnType<typeof articleTranslationFromForm>, goesPublic: boolean) {
	if (!goesPublic) return
	const { data: article, error } = await supabase.from('articles').select('cover_media_id, external_media_url').eq('id', articleId).maybeSingle()
	if (error || !article) throw new Error(`Could not load article media: ${error?.message ?? 'Article not found.'}`)
	if (!article.cover_media_id && !article.external_media_url) throw new FieldError('status', 'Published articles need a cover image or external media URL. Save one in the shared details first.')
	if (article.cover_media_id && !translation.coverAltText) throw new FieldError('coverAltText', 'Published localized content needs localized alt text for its cover image.')
}
async function validateArticleInlineMedia(supabase: Awaited<ReturnType<typeof createClient>>, translation: ReturnType<typeof articleTranslationFromForm>) {
	const mediaIds = articleImageMediaIds(translation.content)
	if (!mediaIds.length) return
	const { data, error } = await supabase.from('media_assets').select('id, mime_type, is_public').in('id', mediaIds)
	if (error) throw new Error(`Could not validate inline article media: ${error.message}`)
	if ((data ?? []).length !== mediaIds.length) throw new FieldError('content', 'One or more inline article images no longer exist in the managed media library.')
	if ((data ?? []).some((asset) => !asset.mime_type?.startsWith('image/'))) throw new FieldError('content', 'Inline article media must use managed image assets.')
	if ((translation.status === 'published' || translation.status === 'scheduled') && (data ?? []).some((asset) => !asset.is_public)) throw new FieldError('content', 'Published or scheduled article images must be public managed media assets.')
}
async function saveArticleCoverAlt(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, locale: (typeof locales)[number], altText: string | null) {
	if (!altText) return
	const { data: article } = await supabase.from('articles').select('cover_media_id').eq('id', articleId).maybeSingle()
	if (!article?.cover_media_id) return
	const { error } = await supabase.from('media_asset_translations').upsert({ media_asset_id: article.cover_media_id, locale, alt_text: altText }, { onConflict: 'media_asset_id,locale' })
	if (error) throw new Error(`Could not save localized cover alt text: ${error.message}`)
}
// Articles appear only in the newsroom readers (listing, detail, selections,
// and the articles on a team profile), all tagged PUBLIC_NEWSROOM_CACHE_TAG.
async function refreshNewsroomPaths(supabase: Awaited<ReturnType<typeof createClient>>, articleId?: string) {
	updateTag(PUBLIC_NEWSROOM_CACHE_TAG)
	revalidatePath('/admin'); revalidatePath('/admin/newsroom'); if (articleId) revalidatePath(`/admin/newsroom/${articleId}`)
	revalidatePath('/newsroom')
	revalidatePath('/[locale]/newsroom', 'page')
	revalidatePath('/[locale]/newsroom/[slug]', 'page')
	if (articleId) { const { data } = await supabase.from('article_translations').select('locale, slug').eq('article_id', articleId); for (const item of data ?? []) { const prefix = item.locale === 'en' ? '' : `/${item.locale}`; revalidatePath(`${prefix}/newsroom/${item.slug}`) } }
}
export async function createArticleAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the article.', async () => {
		const details = articleDetailsFromForm(formData, false); const translation = articleTranslationFromForm(formData, false)
		if (translation.locale !== 'en') return failed('New articles must start with an English translation.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); const articleId = randomUUID(); await validateArticleInlineMedia(supabase, translation)
		// Check the publication rules before anything is written.
		const { goesPublic, row: publication } = publicationColumns({ datedByEditor: true, existing: null, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && !details.coverMediaId && !details.externalMediaUrl) throw new FieldError('status', 'Published articles need a cover image or external media URL.')
		if (goesPublic && details.coverMediaId && !translation.coverAltText) throw new FieldError('coverAltText', 'Published localized content needs localized alt text for its cover image.')
		const { data: article, error } = await supabase.from('articles').insert({ id: articleId, stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (error) return failed(`Could not create the article: ${error.message}`)
		const { error: translationError } = await supabase.from('article_translations').insert({ article_id: article.id, locale: 'en', slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
		if (translationError) return failed(`The article was created, but its English translation could not be saved: ${translationError.message}`)
		await replaceArticleRelations(supabase, article.id, details); await saveArticleCoverAlt(supabase, article.id, 'en', translation.coverAltText); await refreshNewsroomPaths(supabase, article.id)
		return succeeded('Article created.', undefined, { redirectTo: `/admin/newsroom/${article.id}` })
	}, { itemLabels: articleItemLabels })
}
export async function saveArticleDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save article details.', async () => { const details = articleDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('articles').update({ stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, updated_by: profile.id }).eq('id', details.articleId!); if (error) return failed(`Could not save article details: ${error.message}`); await replaceArticleRelations(supabase, details.articleId!, details); await refreshNewsroomPaths(supabase, details.articleId!); return succeeded('Shared article details saved.') }, { itemLabels: articleItemLabels })
}
export async function saveArticleTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this translation.', async () => { const translation = articleTranslationFromForm(formData); await requireActiveStaff(); const supabase = await createClient(); await validateArticleInlineMedia(supabase, translation); const { data: existing, error: existingError } = await supabase.from('article_translations').select(PUBLICATION_COLUMNS).eq('article_id', translation.articleId!).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this translation: ${existingError.message}`); const { goesPublic, row: publication, saved } = publicationColumns({ datedByEditor: true, existing, publishAt: translation.publishAt, status: translation.status }); await ensureArticleCanPublish(supabase, translation.articleId!, translation, goesPublic); const { error } = await supabase.from('article_translations').upsert({ article_id: translation.articleId!, locale: translation.locale, slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'article_id,locale' }); if (error) return failed(`Could not save this translation: ${error.message}`); await saveArticleCoverAlt(supabase, translation.articleId!, translation.locale, translation.coverAltText); await refreshNewsroomPaths(supabase, translation.articleId!); return succeeded(`${translation.locale} translation saved${publishedNotice(saved)}.`, saved) }, { itemLabels: articleItemLabels })
}
// Articles have no is_active flag: archiving sets every published or
// scheduled translation to archived and keeps its published_at, so the date
// and the schedule survive. Drafts are left alone. Restoring returns each
// archived translation to published at its kept date (scheduled again when
// that date is still ahead), or to draft when it was never published.
export async function setArticleArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update this article.', async () => {
		const articleId = z.string().uuid().parse(formData.get('articleId'))
		const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('articles').update({ updated_by: profile.id }).eq('id', articleId)
		if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} the article: ${error.message}`)
		const { data: translations, error: loadError } = await supabase.from('article_translations').select('locale, status, published_at, scheduled_for').eq('article_id', articleId).order('locale')
		if (loadError) return failed(`Could not load the article translations: ${loadError.message}`)
		const affected = (translations ?? []).filter((item) => archive ? item.status === 'published' || item.status === 'scheduled' : item.status === 'archived')
		const changes = affected.map((item) => ({ locale: item.locale, row: archive
			// A legacy 'scheduled' row keeps its time in published_at.
			? { status: 'archived' as const, published_at: item.published_at ?? item.scheduled_for, scheduled_for: null }
			: { status: restoredStatus(item), published_at: item.published_at, scheduled_for: null } }))
		const results = await Promise.all(changes.map(({ locale, row }) => supabase.from('article_translations').update(row).eq('article_id', articleId).eq('locale', locale)))
		const failedUpdate = results.find((result) => result.error)
		if (failedUpdate?.error) return failed(`Could not ${archive ? 'archive' : 'restore'} the article translations: ${failedUpdate.error.message}`)
		await refreshNewsroomPaths(supabase, articleId)
		if (archive) return succeeded(changes.length ? `Article archived: ${changes.map(({ locale }) => locale).join(', ')}. Dates and schedules are kept for a restore.` : 'Article archived. It had no published or scheduled translation.')
		const summary = changes.map(({ locale, row }) => `${locale} ${editorialState(row).status}`).join(', ')
		return succeeded(changes.length ? `Article restored: ${summary}.` : 'Nothing to restore: no translation is archived.')
	})
}
export async function attachArticleCoverAction(input: unknown): Promise<AdminActionResult<{ mediaId: string }>> {
	return adminAction('Could not upload the cover image.', async () => { const parsed = articleCoverSchema.parse(input); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { data: media, error: mediaError } = await supabase.from('media_assets').insert({ object_path: parsed.objectPath, original_filename: parsed.originalFilename, mime_type: parsed.mimeType, file_size_bytes: parsed.fileSizeBytes, width: parsed.width, height: parsed.height, uploaded_by: profile.id }).select('id').single(); if (mediaError) return failed(`The file uploaded, but its media record could not be created: ${mediaError.message}`); const { error: altError } = await supabase.from('media_asset_translations').upsert({ media_asset_id: media.id, locale: 'en', alt_text: parsed.altText }, { onConflict: 'media_asset_id,locale' }); if (altError) return failed(`The cover uploaded, but its English alt text could not be saved: ${altError.message}`); const { error } = await supabase.from('articles').update({ cover_media_id: media.id, updated_by: profile.id }).eq('id', parsed.articleId); if (error) return failed(`The cover was saved, but could not be attached: ${error.message}`); await refreshNewsroomPaths(supabase, parsed.articleId); return succeeded('Cover image uploaded and attached.', { mediaId: media.id }) })
}

export async function createNewsroomTagAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create newsroom tag.', async () => { const parsed = z.object({ stableKey: requiredKey, name: z.string().trim().min(1).max(160), slug: requiredKey, status: z.enum(['draft', 'published']) }).parse({ stableKey: formData.get('stableKey'), name: formData.get('name'), slug: formData.get('slug'), status: formData.get('status') }); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID(); const { data: tag, error } = await supabase.from('tags').insert({ id, stable_key: parsed.stableKey, created_by: profile.id, updated_by: profile.id }).select('id').single(); if (error) return failed(`Could not create tag: ${error.message}`); const { error: translationError } = await supabase.from('tag_translations').insert({ tag_id: tag.id, locale: 'en', slug: parsed.slug, name: parsed.name, status: parsed.status, published_at: parsed.status === 'published' ? new Date().toISOString() : null }); if (translationError) return failed(`The tag was created, but its English label could not be saved: ${translationError.message}`); updateTag(PUBLIC_NEWSROOM_CACHE_TAG); revalidatePath('/admin/newsroom'); return succeeded('Newsroom tag created.') })
}
