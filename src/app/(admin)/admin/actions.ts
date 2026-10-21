'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, documentField, failed, FieldError, jsonField, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { PUBLICATION_COLUMNS, publicationColumns, publishedNotice, type SavedPublication } from '@/lib/admin-publication'
import { countryServiceAssignmentSchema, countryServiceCopySchema, countryStatisticLabelSchema, countryStatisticSchema, httpUrl, optional, optionalEmail, optionalHttpUrl, optionalNumber, optionalText, optionalUuid, profileRoleSchema, requiredKey } from '@/lib/admin-schema.mjs'
import { endOfListOrder, moveRecord } from '@/lib/admin-order'
import { completeCreate, replaceRelation, requireUnused } from '@/lib/admin-writes'
import { articleKindSchema } from '@/lib/article-kinds.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { parkedMetricKey, statisticWritePlan } from '@/lib/relation-writes.mjs'
import { validationMessage } from '@/lib/rich-text-rules.mjs'
import { parseProfileDocument } from '@/lib/team-profile-document'
import { parseCatalogueDocument } from '@/lib/catalogue-document'
import { articleImageMediaIds, parseArticleDocument } from '@/lib/article-document'
import { PUBLIC_CATALOGUE_CACHE_TAG, PUBLIC_NEWSROOM_CACHE_TAG, PUBLIC_OUTREACH_CACHE_TAG, PUBLIC_TEAM_CACHE_TAG } from '@/lib/cache-tags'
import { requireImageAsset, requireLibraryAlt } from '@/lib/media-choices'
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
	portraitMediaId: optionalUuid,
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
	seoTitle: optionalText(160),
	seoDescription: optionalText(320),
	status: z.enum(['draft', 'published']),
})

const peopleItemLabels = { roles: 'Role' }

function cardRoles(roles: z.infer<typeof profileRolesSchema>) {
	if (roles.filter((role) => role.isCardRole).length !== 1) throw new FieldError('roles', 'Select exactly one role for the team card.')
	return roles.map((role, displayOrder) => ({ ...role, displayOrder }))
}

// Roles are replaced as a whole: their order and the single card role are
// unique per locale, so they cannot be upserted row by row. When the new
// roles cannot be written, the previous ones are put back (audit X-13).
async function replaceRoles(
	supabase: Awaited<ReturnType<typeof createClient>>,
	personId: string,
	locale: (typeof locales)[number],
	roles: ReturnType<typeof cardRoles>,
) {
	const { data: previous, error: previousError } = await supabase.from('people_profile_roles').select('id, title, card_label, display_order, is_card_role').eq('person_id', personId).eq('locale', locale)
	if (previousError) throw new Error(`Could not load the profile roles: ${previousError.message}`)
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
	if (!insertError) return
	const { error: restoreError } = previous?.length ? await supabase.from('people_profile_roles').insert(previous.map((role) => ({ ...role, person_id: personId, locale }))) : { error: null }
	throw new Error(`Could not save profile roles: ${insertError.message}.${restoreError ? ` The previous roles could not be put back either (${restoreError.message}); add them again.` : ' The previous roles were kept.'}`)
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
			displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'), portraitMediaId: formData.get('portraitMediaId'),
			slug: formData.get('slug'), cardName: formData.get('cardName'),
			roles: jsonField(formData, 'roles', 'Roles'), profileDocument: jsonField(formData, 'profileDocument', 'The profile document'),
			seoTitle: formData.get('seoTitle'),
			seoDescription: formData.get('seoDescription'), status: formData.get('status'),
		})
		const roles = cardRoles(parsed.roles)
		const profileDocument = documentField('profileDocument', () => parseProfileDocument(parsed.profileDocument))

		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const { data: existingSlug, error: slugError } = await supabase.from('people_translations').select('person_id').eq('locale', 'en').eq('slug', parsed.slug).maybeSingle()
		if (slugError) return failed(`Could not validate the English URL slug: ${slugError.message}`)
		if (existingSlug) throw new FieldError('slug', 'That English URL slug is already in use.')
		await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table: 'people', value: parsed.stableKey })

		await requireImageAsset(supabase, parsed.portraitMediaId, 'portraitMediaId', 'portrait')
		const personId = randomUUID()
		const { data: person, error: personError } = await supabase.from('people').insert({
			id: personId,
			display_name: parsed.displayName, stable_key: parsed.stableKey, email: parsed.email, phone: parsed.phone,
			// A new profile goes to the end of its group (audit PPL-07).
			display_order: await endOfListOrder({ table: 'people', scope: { is_team_member: true, team_group: parsed.teamGroup } }), team_group: parsed.teamGroup,
			portrait_media_id: parsed.portraitMediaId,
			is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on',
			created_by: profile.id, updated_by: profile.id,
		}).select('id').single()
		if (personError) return failed(`Could not create the profile: ${personError.message}`)

		const { row: publication } = publicationColumns({ existing: null, publishAt: null, status: parsed.status })
		await completeCreate(supabase, { table: 'people', id: person.id, what: 'profile' }, async () => {
			const { error: translationError } = await supabase.from('people_translations').insert({
				person_id: person.id, locale: 'en', slug: parsed.slug, card_name: parsed.cardName,
				profile_document: profileDocument, seo_title: parsed.seoTitle,
				seo_description: parsed.seoDescription, ...publication,
			})
			if (translationError) throw new Error(`The English translation could not be saved: ${translationError.message}.`)
			await replaceRoles(supabase, person.id, 'en', roles)
		})

		// A profile created as published is public at once.
		await refreshPersonPaths(supabase, person.id)
		return succeeded('Profile created.', undefined, { redirectTo: `/admin/people/${person.id}` })
	}, { itemLabels: peopleItemLabels })
}

export async function updatePersonAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the profile.', async () => {
		const parsed = sharedProfileSchema.parse({
			displayName: formData.get('displayName'), stableKey: formData.get('stableKey'), email: formData.get('email'),
			phone: formData.get('phone'), displayOrder: formData.get('displayOrder'), teamGroup: formData.get('teamGroup'), portraitMediaId: formData.get('portraitMediaId'),
		})
		const personId = z.string().uuid().parse(formData.get('personId'))
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		await requireImageAsset(supabase, parsed.portraitMediaId, 'portraitMediaId', 'portrait')
		const { error } = await supabase.from('people').update({
			display_name: parsed.displayName, stable_key: parsed.stableKey, email: parsed.email, phone: parsed.phone,
			display_order: parsed.displayOrder, team_group: parsed.teamGroup, portrait_media_id: parsed.portraitMediaId,
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
			seoTitle: formData.get('seoTitle'),
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
		// Active team members of the group only; archived profiles keep their place (audit PPL-09).
		if (!await moveRecord({ direction, id: personId, profileId: profile.id, scope: { is_team_member: true, team_group: current.team_group }, table: 'people', tieBreak: 'display_name' })) return succeeded('Team order is unchanged.')
		revalidatePath('/admin/people')
		updateTag(PUBLIC_TEAM_CACHE_TAG)
		revalidatePath(teamPath('en'))
		return succeeded('Team order saved.')
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
})
function detailsFromForm(formData: FormData, includeEntryId = true) {
	return catalogueDetailsSchema.parse({
		kind: formData.get('kind'),
		entryId: includeEntryId ? formData.get('entryId') : undefined,
		stableKey: formData.get('stableKey'),
		displayOrder: formData.get('displayOrder'),
		iconMediaId: formData.get('iconMediaId'),
		contactIds: jsonField(formData, 'contactIds', 'Contacts'),
	})
}

function translationFromForm(formData: FormData) {
	const parsed = catalogueTranslationSchema.parse({
		kind: formData.get('kind'), entryId: formData.get('entryId'), locale: formData.get('locale'), slug: formData.get('slug'),
		name: formData.get('name'), summary: formData.get('summary'), content: jsonField(formData, 'content', 'The content'),
		seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'),
		status: formData.get('status'),
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

async function validateCatalogueContacts(supabase: Awaited<ReturnType<typeof createClient>>, contactIds: string[]) {
	uniqueIds(contactIds, 'Contacts', 'contactIds')
	if (!contactIds.length) return
	const { data: contacts, error } = await supabase.from('people').select('id').eq('is_active', true).eq('is_team_member', true).in('id', contactIds)
	if (error) throw new Error(`Could not validate team contacts: ${error.message}`)
	if ((contacts ?? []).length !== contactIds.length) throw new FieldError('contactIds', 'Every contact must be an active team member.')
}

// The catalogue owns its team contacts only. Its related articles are
// written by the article editor (article_services, article_sectors) and
// shown read-only here (audit CAT-10).
async function replaceCatalogueContacts(supabase: Awaited<ReturnType<typeof createClient>>, kind: CatalogueKind, entryId: string, contactIds: string[]) {
	const owner = kind === 'services' ? 'service_id' : 'sector_id'
	await replaceRelation(supabase, {
		key: 'person_id', label: 'team contacts', onConflict: `${owner},person_id,relationship`,
		owner: { [owner]: entryId, relationship: 'contact' },
		rows: contactIds.map((person_id, display_order) => ({ [owner]: entryId, person_id, relationship: 'contact', display_order })),
		table: kind === 'services' ? 'service_people' : 'sector_people',
	})
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
		const { profile } = await requireActiveStaff()
		const supabase = await createClient()
		const table = details.kind
		// Everything that can refuse the create is checked before the first write (audit X-13).
		await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table, value: details.stableKey })
		await requireUnused(supabase, { column: 'slug', field: 'slug', label: 'English URL slug', scope: { locale: 'en' }, table: table === 'services' ? 'service_translations' : 'sector_translations', value: translation.slug })
		await validateCatalogueContacts(supabase, details.contactIds)
		await requireImageAsset(supabase, details.iconMediaId, 'iconMediaId', 'icon')
		if (goesPublic && details.iconMediaId) await requireLibraryAlt(supabase, { field: 'iconAlt', label: 'icon', locale: 'en', mediaId: details.iconMediaId })
		const entryId = randomUUID()
		const { data: entry, error: createError } = await supabase.from(table).insert({ id: entryId, stable_key: details.stableKey, display_order: await endOfListOrder({ table }), icon_media_id: details.iconMediaId, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (createError) return failed(`Could not create the ${details.kind.slice(0, -1)}: ${createError.message}`)
		await completeCreate(supabase, { table, id: entry.id, what: details.kind.slice(0, -1) }, async () => {
			const { error: translationError } = details.kind === 'services'
				? await supabase.from('service_translations').insert({ service_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
				: await supabase.from('sector_translations').insert({ sector_id: entry.id, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
			if (translationError) throw new Error(`The English translation could not be saved: ${translationError.message}.`)
			await replaceCatalogueContacts(supabase, details.kind, entry.id, details.contactIds)
		})
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
		await requireImageAsset(supabase, details.iconMediaId, 'iconMediaId', 'icon')
		await validateCatalogueContacts(supabase, details.contactIds)
		const { error } = await supabase.from(details.kind).update({ stable_key: details.stableKey, display_order: details.displayOrder, icon_media_id: details.iconMediaId, updated_by: profile.id }).eq('id', details.entryId)
		if (error) return failed(`Could not save catalogue details: ${error.message}`)
		await replaceCatalogueContacts(supabase, details.kind, details.entryId, details.contactIds)
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
		if (goesPublic && catalogueEntry.icon_media_id) await requireLibraryAlt(supabase, { field: 'iconAlt', label: 'icon', locale: translation.locale, mediaId: catalogueEntry.icon_media_id })
		const { error } = translation.kind === 'services'
			? await supabase.from('service_translations').upsert({ service_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'service_id,locale' })
			: await supabase.from('sector_translations').upsert({ sector_id: translation.entryId, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'sector_id,locale' })
		if (error) return failed(`Could not save this translation: ${error.message}`)
		await refreshCataloguePaths(supabase, translation.kind, translation.entryId)
		return succeeded(`${translation.locale} translation saved${publishedNotice(saved)}.`, saved)
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
		if (!await moveRecord({ direction, id: entryId, profileId: profile.id, table: kind, tieBreak: 'stable_key' })) return succeeded('Catalogue order is unchanged.')
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
		await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table: 'regions', value: details.stableKey })
		await requireUnused(supabase, { column: 'slug', field: 'slug', label: 'English URL slug', scope: { locale: 'en' }, table: 'region_translations', value: translation.slug })
		const { error: regionError } = await supabase.from('regions').insert({ id, stable_key: details.stableKey, display_order: await endOfListOrder({ table: 'regions' }), map_config: details.mapConfig, created_by: profile.id, updated_by: profile.id })
		if (regionError) return failed(`Could not create the region: ${regionError.message}`)
		await completeCreate(supabase, { table: 'regions', id, what: 'region' }, async () => {
			const { error: translationError } = await supabase.from('region_translations').insert({ region_id: id, locale: 'en', slug: translation.slug, name: translation.name, ...publication })
			if (translationError) throw new Error(`The English translation could not be saved: ${translationError.message}.`)
		})
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
const countryTranslationSchema = z.object({ countryCode: isoCountryCode, locale: z.enum(locales), slug: requiredKey, name: z.string().trim().min(1).max(160), summary: optionalText(2_000), coverageSummary: optionalText(2_000), content: z.unknown(), seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(outreachStatuses), serviceCopies: z.array(countryServiceCopySchema).max(100), statisticLabels: z.array(countryStatisticLabelSchema).max(100) })

function countryDetailsFromForm(formData: FormData) {
	const parsed = countryDetailsSchema.parse({ countryCode: formData.get('countryCode'), regionId: formData.get('regionId'), isCovered: formData.get('isCovered') === 'on', displayOrder: formData.get('displayOrder'), lastReviewedOn: formData.get('lastReviewedOn'), flagMediaId: formData.get('flagMediaId'), outlineMediaId: formData.get('outlineMediaId'), serviceAssignments: jsonField(formData, 'serviceAssignments', 'Country services'), expertIds: jsonField(formData, 'expertIds', 'Country experts'), officeIds: jsonField(formData, 'officeIds', 'Country offices'), statistics: jsonField(formData, 'statistics', 'Statistics') })
	uniqueIds(parsed.serviceAssignments.map((item) => item.serviceId), 'Country services', 'serviceAssignments'); uniqueIds(parsed.expertIds, 'Country experts', 'expertIds'); uniqueIds(parsed.officeIds, 'Country offices', 'officeIds'); uniqueIds(parsed.statistics.map((item) => item.metricKey), 'Statistic metric keys', 'statistics')
	return { ...parsed, mapConfig: mapConfigFromForm(formData) }
}
function countryTranslationFromForm(formData: FormData) {
	const parsed = countryTranslationSchema.parse({ countryCode: formData.get('countryCode'), locale: formData.get('locale'), slug: formData.get('slug'), name: formData.get('name'), summary: formData.get('summary'), coverageSummary: formData.get('coverageSummary'), content: jsonField(formData, 'content', 'The country content'), seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'), status: formData.get('status'), serviceCopies: jsonField(formData, 'serviceCopies', 'Country service copy'), statisticLabels: jsonField(formData, 'statisticLabels', 'Statistic labels') })
	return { ...parsed, content: documentField('content', () => parseCatalogueDocument(parsed.content)), serviceCopies: parsed.serviceCopies.map((copy, index) => ({ ...copy, content: documentField('serviceCopies', () => { try { return parseCatalogueDocument(copy.content) } catch (error) { throw new Error(`Service copy ${index + 1}: ${validationMessage(error)}`) } }) })), publishAt: formData.get('publishAt') }
}

async function validateCountryRelations(supabase: Awaited<ReturnType<typeof createClient>>, details: ReturnType<typeof countryDetailsFromForm>) {
	if (details.serviceAssignments.length) { const { data, error } = await supabase.from('services').select('id').eq('is_active', true).in('id', details.serviceAssignments.map((item) => item.serviceId)); if (error) throw new Error(`Could not validate country services: ${error.message}`); if ((data ?? []).length !== details.serviceAssignments.length) throw new FieldError('serviceAssignments', 'Every assigned service must be active.') }
	if (details.expertIds.length) { const { data, error } = await supabase.from('people').select('id').eq('is_active', true).in('id', details.expertIds); if (error) throw new Error(`Could not validate country experts: ${error.message}`); if ((data ?? []).length !== details.expertIds.length) throw new FieldError('expertIds', 'Every country expert must be active.') }
	if (details.officeIds.length) { const { data, error } = await supabase.from('offices').select('id').eq('is_active', true).in('id', details.officeIds); if (error) throw new Error(`Could not validate country offices: ${error.message}`); if ((data ?? []).length !== details.officeIds.length) throw new FieldError('officeIds', 'Every assigned office must be active.') }
}

/** A country statistic as the editor holds it, with its id once stored. */
export type SavedStatistic = { id: string; metricKey: string; numericValue: number | null; unit: string | null; statisticYear: number | null; sourceUrl: string | null; displayOrder: number }
/** What a shared-details save returns: the stored statistics (with ids, for their labels) and the assigned services (for their copy) (audit OUT-09, OUT-13). */
export type SavedCountryDetails = { statistics: SavedStatistic[]; serviceIds: string[] }

// Statistics keep their ids: a renamed metric key updates its row and keeps
// its labels (audit OUT-10). The order of the writes keeps the unique
// (country, metric key) pair valid after every request (relation-writes.mjs).
async function replaceCountryStatistics(supabase: Awaited<ReturnType<typeof createClient>>, countryCode: string, statistics: ReturnType<typeof countryDetailsFromForm>['statistics']): Promise<SavedStatistic[]> {
	const { data: stored, error: storedError } = await supabase.from('country_statistics').select('id, metric_key').eq('country_code', countryCode)
	if (storedError) throw new Error(`Could not load the country statistics: ${storedError.message}`)
	const plan = statisticWritePlan((stored ?? []).map((row) => ({ id: row.id, metricKey: row.metric_key })), statistics)
	if (plan.unknown.length) throw new FieldError('statistics', 'A statistic was removed since this page was opened. Reload the page and enter your changes again.')
	const values = (item: (typeof statistics)[number]) => ({ metric_key: item.metricKey, numeric_value: item.numericValue, unit: item.unit, statistic_year: item.statisticYear, source_url: item.sourceUrl, display_order: item.displayOrder })
	if (plan.remove.length) { const { error } = await supabase.from('country_statistics').delete().eq('country_code', countryCode).in('id', plan.remove); if (error) throw new Error(`Could not remove statistics: ${error.message}`) }
	for (const id of plan.parked) { const { error } = await supabase.from('country_statistics').update({ metric_key: parkedMetricKey(id) }).eq('id', id).eq('country_code', countryCode); if (error) throw new Error(`Could not rename statistics: ${error.message}`) }
	for (const item of plan.update) { const { error } = await supabase.from('country_statistics').update(values(item)).eq('id', item.id).eq('country_code', countryCode); if (error) throw new Error(`Could not save the statistic "${item.metricKey}": ${error.message}`) }
	if (plan.insert.length) { const { error } = await supabase.from('country_statistics').insert(plan.insert.map((item) => ({ country_code: countryCode, ...values(item) }))); if (error) throw new Error(`Could not add statistics: ${error.message}`) }
	const { data: saved, error: savedError } = await supabase.from('country_statistics').select('id, metric_key, numeric_value, unit, statistic_year, source_url, display_order').eq('country_code', countryCode).order('display_order').order('metric_key')
	if (savedError) throw new Error(`Could not load the saved statistics: ${savedError.message}`)
	return (saved ?? []).map((item) => ({ id: item.id, metricKey: item.metric_key, numericValue: item.numeric_value === null ? null : Number(item.numeric_value), unit: item.unit, statisticYear: item.statistic_year, sourceUrl: item.source_url, displayOrder: item.display_order }))
}

// Each list upserts its chosen rows first and removes the others last, so a
// failure part-way never empties a list (audit X-13).
async function replaceCountryRelations(supabase: Awaited<ReturnType<typeof createClient>>, details: ReturnType<typeof countryDetailsFromForm>): Promise<SavedCountryDetails> {
	const country_code = details.countryCode
	await replaceRelation(supabase, { key: 'service_id', label: 'country services', onConflict: 'country_code,service_id', owner: { country_code }, rows: details.serviceAssignments.map((item, display_order) => ({ country_code, service_id: item.serviceId, coverage_level: item.coverageLevel, display_order })), table: 'country_services' })
	await replaceRelation(supabase, { key: 'person_id', label: 'country experts', onConflict: 'country_code,person_id,relationship', owner: { country_code, relationship: 'expert' }, rows: details.expertIds.map((person_id, display_order) => ({ country_code, person_id, relationship: 'expert', display_order })), table: 'country_people' })
	await replaceRelation(supabase, { key: 'office_id', label: 'country offices', onConflict: 'country_code,office_id', owner: { country_code }, rows: details.officeIds.map((office_id, display_order) => ({ country_code, office_id, display_order })), table: 'country_offices' })
	const statistics = await replaceCountryStatistics(supabase, country_code, details.statistics)
	return { serviceIds: details.serviceAssignments.map((item) => item.serviceId), statistics }
}

export async function createCountryAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the country.', async () => {
		const details = countryDetailsFromForm(formData); const translation = countryTranslationFromForm(formData); if (translation.locale !== 'en') return failed('New countries must start with an English translation.')
		const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { data: existingCountry, error: existingCountryError } = await supabase.from('countries').select('code').eq('code', details.countryCode).maybeSingle()
		if (existingCountryError) return failed(`Could not check the country code: ${existingCountryError.message}`)
		if (existingCountry) throw new FieldError('countryCode', `${details.countryCode} already exists. Open it from the country list.`)
		await requireUnused(supabase, { column: 'slug', field: 'slug', label: 'English URL slug', scope: { locale: 'en' }, table: 'country_translations', value: translation.slug })
		await validateCountryRelations(supabase, details)
		const { error: countryError } = await supabase.from('countries').insert({ code: details.countryCode, region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, created_by: profile.id, updated_by: profile.id })
		if (countryError) return failed(`Could not create the country: ${countryError.message}`)
		await completeCreate(supabase, { column: 'code', table: 'countries', id: details.countryCode, what: 'country' }, async () => {
			const { error: translationError } = await supabase.from('country_translations').insert({ country_code: details.countryCode, locale: 'en', slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
			if (translationError) throw new Error(`The English translation could not be saved: ${translationError.message}.`)
			await replaceCountryRelations(supabase, details)
		})
		await refreshOutreachPaths(supabase, details.countryCode)
		return succeeded('Country created.', undefined, { redirectTo: `/admin/outreach/${details.countryCode}` })
	}, { itemLabels: outreachItemLabels })
}

export async function saveCountryDetailsAction(formData: FormData): Promise<AdminActionResult<SavedCountryDetails>> {
	return adminAction('Could not save country details.', async () => {
		const details = countryDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient()
		await requireImageAsset(supabase, details.flagMediaId, 'flagMediaId', 'flag'); await requireImageAsset(supabase, details.outlineMediaId, 'outlineMediaId', 'outline')
		await validateCountryRelations(supabase, details)
		const { error } = await supabase.from('countries').update({ region_id: details.regionId, flag_media_id: details.flagMediaId, outline_media_id: details.outlineMediaId, is_covered: details.isCovered, map_config: details.mapConfig, display_order: details.displayOrder, last_reviewed_on: details.lastReviewedOn, updated_by: profile.id }).eq('code', details.countryCode)
		if (error) return failed(`Could not save country details: ${error.message}`)
		const saved = await replaceCountryRelations(supabase, details); await refreshOutreachPaths(supabase, details.countryCode)
		return succeeded('Country identity, coverage, ordering, and relations saved.', saved)
	}, { itemLabels: outreachItemLabels })
}

export async function saveCountryTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this country translation.', async () => {
		const translation = countryTranslationFromForm(formData); const supabase = await createClient(); await requireActiveStaff()
		const { data: country, error: countryError } = await supabase.from('countries').select('flag_media_id, outline_media_id').eq('code', translation.countryCode).maybeSingle(); if (countryError || !country) return failed(`Could not load country details: ${countryError?.message ?? 'Country not found.'}`)
		const { data: existing, error: existingError } = await supabase.from('country_translations').select(PUBLICATION_COLUMNS).eq('country_code', translation.countryCode).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this country translation: ${existingError.message}`)
		const { goesPublic, row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		if (goesPublic && country.flag_media_id) await requireLibraryAlt(supabase, { field: 'flagAlt', label: 'flag', locale: translation.locale, mediaId: country.flag_media_id })
		if (goesPublic && country.outline_media_id) await requireLibraryAlt(supabase, { field: 'outlineAlt', label: 'outline', locale: translation.locale, mediaId: country.outline_media_id })
		// The service copy and labels are checked before anything is written (audit X-13).
		const [{ data: assignments, error: assignmentError }, { data: statistics, error: statisticsError }] = await Promise.all([supabase.from('country_services').select('service_id').eq('country_code', translation.countryCode), supabase.from('country_statistics').select('id').eq('country_code', translation.countryCode)])
		if (assignmentError || statisticsError) return failed(`Could not validate the country services and statistics: ${assignmentError?.message ?? statisticsError?.message}`)
		const assigned = new Set((assignments ?? []).map((item) => item.service_id)); if (translation.serviceCopies.some((item) => !assigned.has(item.serviceId))) throw new FieldError('serviceCopies', 'Country service copy can only be saved for assigned services. Save the shared details first.')
		const statisticIds = (statistics ?? []).map((item) => item.id); if (translation.statisticLabels.some((item) => !statisticIds.includes(item.statisticId))) throw new FieldError('statisticLabels', 'Statistic labels must belong to this country. Reload the page and try again.')
		const { error } = await supabase.from('country_translations').upsert({ country_code: translation.countryCode, locale: translation.locale, slug: translation.slug, name: translation.name, summary: translation.summary, coverage_summary: translation.coverageSummary, content: translation.content, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'country_code,locale' })
		if (error) return failed(`Could not save this country translation: ${error.message}`)
		const country_code = translation.countryCode; const locale = translation.locale
		await replaceRelation(supabase, { key: 'service_id', label: 'country service copy', onConflict: 'country_code,service_id,locale', owner: { country_code, locale }, rows: translation.serviceCopies.map((item) => ({ country_code, service_id: item.serviceId, locale, summary: item.summary, content: item.content })), table: 'country_service_translations' })
		// A label left empty is removed, so its statistic is hidden in this language again.
		if (translation.statisticLabels.length) { const { error: labelsError } = await supabase.from('country_statistic_translations').upsert(translation.statisticLabels.map((item) => ({ statistic_id: item.statisticId, locale, label: item.label, display_value: item.displayValue })), { onConflict: 'statistic_id,locale' }); if (labelsError) throw new Error(`The country text was saved, but its statistic labels could not be: ${labelsError.message}`) }
		const cleared = statisticIds.filter((id) => !translation.statisticLabels.some((item) => item.statisticId === id))
		if (cleared.length) { const { error: clearError } = await supabase.from('country_statistic_translations').delete().eq('locale', locale).in('statistic_id', cleared); if (clearError) throw new Error(`The country text was saved, but cleared statistic labels could not be removed: ${clearError.message}`) }
		await refreshOutreachPaths(supabase, translation.countryCode); return succeeded(`${translation.locale} country content saved${publishedNotice(saved)}.`, saved)
	}, { itemLabels: outreachItemLabels })
}

const officeDetailsSchema = z.object({ officeId: optionalUuid, stableKey: requiredKey, countryCode: optional(isoCountryCode), email: optionalEmail(), phone: optionalText(80), latitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -90 && value <= 90), 'Latitude must be between -90 and 90.'), longitude: optionalNumber.refine((value) => value === null || (Number.isFinite(value) && value >= -180 && value <= 180), 'Longitude must be between -180 and 180.'), displayOrder: z.coerce.number().int().min(0).max(100_000) })
const officeTranslationSchema = z.object({ officeId: optionalUuid, locale: z.enum(locales), name: z.string().trim().min(1).max(160), city: optionalText(160), address: optionalText(2_000), status: z.enum(outreachStatuses) })
function officeDetailsFromForm(formData: FormData, includeId = true) { return officeDetailsSchema.parse({ officeId: includeId ? formData.get('officeId') : undefined, stableKey: formData.get('stableKey'), countryCode: formData.get('countryCode'), email: formData.get('email'), phone: formData.get('phone'), latitude: formData.get('latitude'), longitude: formData.get('longitude'), displayOrder: formData.get('displayOrder') }) }
function officeTranslationFromForm(formData: FormData, includeId = true) { const parsed = officeTranslationSchema.parse({ officeId: includeId ? formData.get('officeId') : undefined, locale: formData.get('locale'), name: formData.get('name'), city: formData.get('city'), address: formData.get('address'), status: formData.get('status') }); return { ...parsed, publishAt: formData.get('publishAt') } }
async function refreshOfficePaths(supabase: Awaited<ReturnType<typeof createClient>>, countryCode?: string) { await refreshOutreachPaths(supabase, countryCode) }
export async function createOfficeAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not create the office.', async () => { const details = officeDetailsFromForm(formData, false); const translation = officeTranslationFromForm(formData, false); if (translation.locale !== 'en') return failed('New offices must start with an English translation.'); const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status }); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID(); await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table: 'offices', value: details.stableKey }); const { error: officeError } = await supabase.from('offices').insert({ id, stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: await endOfListOrder({ table: 'offices' }), created_by: profile.id, updated_by: profile.id }); if (officeError) return failed(`Could not create the office: ${officeError.message}`); await completeCreate(supabase, { table: 'offices', id, what: 'office' }, async () => { const { error: translationError } = await supabase.from('office_translations').insert({ office_id: id, locale: 'en', name: translation.name, city: translation.city, address: translation.address, ...publication }); if (translationError) throw new Error(`The English office content could not be saved: ${translationError.message}.`) }); await refreshOfficePaths(supabase, details.countryCode ?? undefined); return succeeded('Office created.', undefined, { redirectTo: `/admin/outreach/offices/${id}` }) }) }
export async function saveOfficeDetailsAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not save office details.', async () => { const details = officeDetailsFromForm(formData); if (!details.officeId) return failed('Invalid office.'); const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ stable_key: details.stableKey, country_code: details.countryCode, email: details.email, phone: details.phone, latitude: details.latitude, longitude: details.longitude, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.officeId); if (error) return failed(`Could not save office details: ${error.message}`); await refreshOfficePaths(supabase, details.countryCode ?? undefined); return succeeded('Office details saved.') }) }
export async function saveOfficeTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> { return adminAction('Could not save this office translation.', async () => { const translation = officeTranslationFromForm(formData); if (!translation.officeId) return failed('Invalid office.'); await requireActiveStaff(); const supabase = await createClient(); const { data: existing, error: existingError } = await supabase.from('office_translations').select(PUBLICATION_COLUMNS).eq('office_id', translation.officeId).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this office translation: ${existingError.message}`); const { row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status }); const { error } = await supabase.from('office_translations').upsert({ office_id: translation.officeId, locale: translation.locale, name: translation.name, city: translation.city, address: translation.address, ...publication }, { onConflict: 'office_id,locale' }); if (error) return failed(`Could not save this office translation: ${error.message}`); await refreshOfficePaths(supabase); return succeeded(`${translation.locale} office content saved${publishedNotice(saved)}.`, saved) }) }
export async function setOfficeArchivedAction(formData: FormData): Promise<AdminActionResult> { return adminAction('Could not update this office.', async () => { const officeId = z.string().uuid().parse(formData.get('officeId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'; const { profile } = await requireActiveStaff(); const supabase = await createClient(); const { error } = await supabase.from('offices').update({ is_active: !archive, updated_by: profile.id }).eq('id', officeId); if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} this office: ${error.message}`); await refreshOfficePaths(supabase); return succeeded(archive ? 'Office archived.' : 'Office restored.') }) }

const articleStatuses = ['draft', 'scheduled', 'published', 'archived'] as const
const articleDetailsSchema = z.object({
	articleId: optionalUuid,
	stableKey: requiredKey,
	// One of the nine kinds the public newsroom labels (audit NEWS-11).
	kind: articleKindSchema,
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
	const parsed = articleTranslationSchema.parse({ articleId: formData.get('articleId'), locale: formData.get('locale'), slug: formData.get('slug'), title: formData.get('title'), excerpt: formData.get('excerpt'), content: jsonField(formData, 'content', 'The article content'), sources: jsonField(formData, 'sources', 'Sources'), seoTitle: formData.get('seoTitle'), seoDescription: formData.get('seoDescription'), status: formData.get('status') })
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
async function validateArticleRelations(supabase: Awaited<ReturnType<typeof createClient>>, details: ReturnType<typeof articleDetailsFromForm>) {
	await Promise.all([
		validateRelationIds(supabase, 'people', details.authorIds, 'authors'), validateRelationIds(supabase, 'tags', details.tagIds, 'tags'), validateRelationIds(supabase, 'services', details.serviceIds, 'services'), validateRelationIds(supabase, 'sectors', details.sectorIds, 'sectors'), validateRelationIds(supabase, 'articles', details.relatedArticleIds, 'related articles'),
	])
}
// The article editor owns its services and sectors; the catalogue lists them
// read-only (audit CAT-10). Each list upserts its chosen rows first and
// removes the others last, so a failure never empties a list (audit X-13).
async function replaceArticleRelations(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, details: ReturnType<typeof articleDetailsFromForm>) {
	const article_id = articleId
	await Promise.all([
		replaceRelation(supabase, { key: 'person_id', label: 'authors', onConflict: 'article_id,person_id', owner: { article_id }, rows: details.authorIds.map((person_id, display_order) => ({ article_id, person_id, display_order })), table: 'article_authors' }),
		replaceRelation(supabase, { key: 'tag_id', label: 'tags', onConflict: 'article_id,tag_id', owner: { article_id }, rows: details.tagIds.map((tag_id) => ({ article_id, tag_id })), table: 'article_tags' }),
		replaceRelation(supabase, { key: 'service_id', label: 'related services', onConflict: 'article_id,service_id', owner: { article_id }, rows: details.serviceIds.map((service_id) => ({ article_id, service_id })), table: 'article_services' }),
		replaceRelation(supabase, { key: 'sector_id', label: 'related sectors', onConflict: 'article_id,sector_id', owner: { article_id }, rows: details.sectorIds.map((sector_id) => ({ article_id, sector_id })), table: 'article_sectors' }),
		replaceRelation(supabase, { key: 'related_article_id', label: 'related articles', onConflict: 'source_article_id,related_article_id', owner: { source_article_id: article_id }, rows: details.relatedArticleIds.map((related_article_id, display_order) => ({ source_article_id: article_id, related_article_id, display_order })), table: 'article_relations' }),
	])
}
// Published and scheduled translations need a cover (or external media) and
// the cover's alt text in their locale, which lives in the Media library.
async function ensureArticleCanPublish(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, locale: (typeof locales)[number], goesPublic: boolean) {
	if (!goesPublic) return
	const { data: article, error } = await supabase.from('articles').select('cover_media_id, external_media_url').eq('id', articleId).maybeSingle()
	if (error || !article) throw new Error(`Could not load article media: ${error?.message ?? 'Article not found.'}`)
	if (!article.cover_media_id && !article.external_media_url) throw new FieldError('status', 'Published articles need a cover image or external media URL. Save one in the shared details first.')
	if (article.cover_media_id) await requireLibraryAlt(supabase, { field: 'coverAlt', label: 'cover image', locale, mediaId: article.cover_media_id })
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
		await requireImageAsset(supabase, details.coverMediaId, 'coverMediaId', 'cover image')
		if (goesPublic && details.coverMediaId) await requireLibraryAlt(supabase, { field: 'coverAlt', label: 'cover image', locale: 'en', mediaId: details.coverMediaId })
		await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table: 'articles', value: details.stableKey })
		await requireUnused(supabase, { column: 'slug', field: 'slug', label: 'English URL slug', scope: { locale: 'en' }, table: 'article_translations', value: translation.slug })
		await validateArticleRelations(supabase, details)
		const { data: article, error } = await supabase.from('articles').insert({ id: articleId, stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, created_by: profile.id, updated_by: profile.id }).select('id').single()
		if (error) return failed(`Could not create the article: ${error.message}`)
		await completeCreate(supabase, { table: 'articles', id: article.id, what: 'article' }, async () => {
			const { error: translationError } = await supabase.from('article_translations').insert({ article_id: article.id, locale: 'en', slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication })
			if (translationError) throw new Error(`The English translation could not be saved: ${translationError.message}.`)
			await replaceArticleRelations(supabase, article.id, details)
		})
		await refreshNewsroomPaths(supabase, article.id)
		return succeeded('Article created.', undefined, { redirectTo: `/admin/newsroom/${article.id}` })
	}, { itemLabels: articleItemLabels })
}
export async function saveArticleDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save article details.', async () => { const details = articleDetailsFromForm(formData); const { profile } = await requireActiveStaff(); const supabase = await createClient(); await requireImageAsset(supabase, details.coverMediaId, 'coverMediaId', 'cover image'); await validateArticleRelations(supabase, details); const { error } = await supabase.from('articles').update({ stable_key: details.stableKey, kind: details.kind, cover_media_id: details.coverMediaId, external_media_url: details.externalMediaUrl, is_featured: details.isFeatured, featured_order: details.featuredOrder, updated_by: profile.id }).eq('id', details.articleId!); if (error) return failed(`Could not save article details: ${error.message}`); await replaceArticleRelations(supabase, details.articleId!, details); await refreshNewsroomPaths(supabase, details.articleId!); return succeeded('Shared article details saved.') }, { itemLabels: articleItemLabels })
}
export async function saveArticleTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this translation.', async () => { const translation = articleTranslationFromForm(formData); await requireActiveStaff(); const supabase = await createClient(); await validateArticleInlineMedia(supabase, translation); const { data: existing, error: existingError } = await supabase.from('article_translations').select(PUBLICATION_COLUMNS).eq('article_id', translation.articleId!).eq('locale', translation.locale).maybeSingle(); if (existingError) return failed(`Could not load this translation: ${existingError.message}`); const { goesPublic, row: publication, saved } = publicationColumns({ datedByEditor: true, existing, publishAt: translation.publishAt, status: translation.status }); await ensureArticleCanPublish(supabase, translation.articleId!, translation.locale, goesPublic); const { error } = await supabase.from('article_translations').upsert({ article_id: translation.articleId!, locale: translation.locale, slug: translation.slug, title: translation.title, excerpt: translation.excerpt, content: translation.content, sources: translation.sources, seo_title: translation.seoTitle, seo_description: translation.seoDescription, ...publication }, { onConflict: 'article_id,locale' }); if (error) return failed(`Could not save this translation: ${error.message}`); await refreshNewsroomPaths(supabase, translation.articleId!); return succeeded(`${translation.locale} translation saved${publishedNotice(saved)}.`, saved) }, { itemLabels: articleItemLabels })
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
// Newsroom tags (audit NEWS-10): a stable key and order shared by every
// language, and a label, URL slug and publication per language. The public
// newsroom offers a tag in a language only when its translation there is
// published and the tag is active, so archiving hides it everywhere.
const tagDetailsSchema = z.object({ tagId: optionalUuid, stableKey: requiredKey, displayOrder: z.coerce.number().int().min(0).max(100_000) })
const tagTranslationSchema = z.object({ tagId: optionalUuid, locale: z.enum(locales), name: z.string().trim().min(1, 'Enter the tag label.').max(160), slug: requiredKey, status: z.enum(articleStatuses) })

function tagTranslationFromForm(formData: FormData, includeId = true) {
	const parsed = tagTranslationSchema.parse({ tagId: includeId ? formData.get('tagId') : undefined, locale: formData.get('locale'), name: formData.get('name'), slug: formData.get('slug'), status: formData.get('status') })
	return { ...parsed, publishAt: formData.get('publishAt') }
}

function refreshTagPaths(tagId?: string) {
	updateTag(PUBLIC_NEWSROOM_CACHE_TAG)
	revalidatePath('/admin'); revalidatePath('/admin/newsroom'); revalidatePath('/admin/newsroom/tags'); if (tagId) revalidatePath(`/admin/newsroom/tags/${tagId}`)
	revalidatePath('/newsroom'); revalidatePath('/[locale]/newsroom', 'page'); revalidatePath('/[locale]/newsroom/[slug]', 'page')
}

export async function createNewsroomTagAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not create the tag.', async () => {
		const stableKey = requiredKey.parse(formData.get('stableKey'))
		const translation = tagTranslationFromForm(formData, false)
		if (translation.locale !== 'en') return failed('New tags must start with an English label.')
		const { row: publication } = publicationColumns({ existing: null, publishAt: translation.publishAt, status: translation.status })
		const { profile } = await requireActiveStaff(); const supabase = await createClient(); const id = randomUUID()
		await requireUnused(supabase, { column: 'stable_key', field: 'stableKey', label: 'stable key', table: 'tags', value: stableKey })
		await requireUnused(supabase, { column: 'slug', field: 'slug', label: 'English URL slug', scope: { locale: 'en' }, table: 'tag_translations', value: translation.slug })
		const { error } = await supabase.from('tags').insert({ id, stable_key: stableKey, display_order: await endOfListOrder({ table: 'tags' }), created_by: profile.id, updated_by: profile.id })
		if (error) return failed(`Could not create the tag: ${error.message}`)
		await completeCreate(supabase, { table: 'tags', id, what: 'tag' }, async () => {
			const { error: translationError } = await supabase.from('tag_translations').insert({ tag_id: id, locale: 'en', slug: translation.slug, name: translation.name, ...publication })
			if (translationError) throw new Error(`The English label could not be saved: ${translationError.message}.`)
		})
		refreshTagPaths(id)
		return succeeded('Tag created.', undefined, { redirectTo: `/admin/newsroom/tags/${id}` })
	})
}

export async function saveTagDetailsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the tag details.', async () => {
		const details = tagDetailsSchema.parse({ tagId: formData.get('tagId'), stableKey: formData.get('stableKey'), displayOrder: formData.get('displayOrder') })
		if (!details.tagId) return failed('Invalid tag.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		await requireUnused(supabase, { column: 'stable_key', except: { column: 'id', value: details.tagId }, field: 'stableKey', label: 'stable key', table: 'tags', value: details.stableKey })
		const { error } = await supabase.from('tags').update({ stable_key: details.stableKey, display_order: details.displayOrder, updated_by: profile.id }).eq('id', details.tagId)
		if (error) return failed(`Could not save the tag details: ${error.message}`)
		refreshTagPaths(details.tagId); return succeeded('Tag details saved.')
	})
}

export async function saveTagTranslationAction(formData: FormData): Promise<AdminActionResult<SavedPublication>> {
	return adminAction('Could not save this tag label.', async () => {
		const translation = tagTranslationFromForm(formData); if (!translation.tagId) return failed('Invalid tag.')
		await requireActiveStaff(); const supabase = await createClient()
		await requireUnused(supabase, { column: 'slug', except: { column: 'tag_id', value: translation.tagId }, field: 'slug', label: `${translation.locale} URL slug`, scope: { locale: translation.locale }, table: 'tag_translations', value: translation.slug })
		const { data: existing, error: existingError } = await supabase.from('tag_translations').select(PUBLICATION_COLUMNS).eq('tag_id', translation.tagId).eq('locale', translation.locale).maybeSingle()
		if (existingError) return failed(`Could not load this tag label: ${existingError.message}`)
		const { row: publication, saved } = publicationColumns({ existing, publishAt: translation.publishAt, status: translation.status })
		const { error } = await supabase.from('tag_translations').upsert({ tag_id: translation.tagId, locale: translation.locale, slug: translation.slug, name: translation.name, ...publication }, { onConflict: 'tag_id,locale' })
		if (error) return failed(`Could not save this tag label: ${error.message}`)
		refreshTagPaths(translation.tagId); return succeeded(`${translation.locale} label saved${publishedNotice(saved)}.`, saved)
	})
}

export async function setTagArchivedAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not update this tag.', async () => {
		const tagId = z.string().uuid().parse(formData.get('tagId')); const archive = z.enum(['true', 'false']).parse(formData.get('archive')) === 'true'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { error } = await supabase.from('tags').update({ is_active: !archive, updated_by: profile.id }).eq('id', tagId)
		if (error) return failed(`Could not ${archive ? 'archive' : 'restore'} this tag: ${error.message}`)
		refreshTagPaths(tagId); return succeeded(archive ? 'Tag archived. It is no longer offered in the article editor or on the newsroom; articles keep it for a restore.' : 'Tag restored.')
	})
}
