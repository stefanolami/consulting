'use server'

import { randomUUID } from 'node:crypto'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { parseProfileDocument, profileDocumentFromLegacy } from '@/lib/team-profile-document'
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
		slug: requiredKey, cardName: optionalText(160), primaryRole: z.string().trim().min(1).max(160),
		intro: optionalText(10_000), seoTitle: optionalText(160), seoDescription: optionalText(320), status: z.enum(['draft', 'published']),
	}).safeParse({
		slug: formData.get('slug'), cardName: formData.get('cardName') || undefined, primaryRole: formData.get('primaryRole'),
		intro: formData.get('intro') || undefined, seoTitle: formData.get('seoTitle') || undefined,
		seoDescription: formData.get('seoDescription') || undefined, status: formData.get('status'),
	})
	if (!shared.success || !english.success) throw new Error(shared.error?.issues[0]?.message ?? english.error?.issues[0]?.message ?? 'Enter a valid profile.')

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: existingSlug, error: slugError } = await supabase.from('people_translations').select('person_id').eq('locale', 'en').eq('slug', english.data.slug).maybeSingle()
	if (slugError) throw new Error(`Could not validate the English URL slug: ${slugError.message}`)
	if (existingSlug) throw new Error('That English URL slug is already in use.')

	const { data: person, error: personError } = await supabase.from('people').insert({
		display_name: shared.data.displayName, stable_key: shared.data.stableKey, email: shared.data.email, phone: shared.data.phone,
		display_order: shared.data.displayOrder, team_group: shared.data.teamGroup,
		is_team_member: formData.get('isTeamMember') === 'on', is_author: formData.get('isAuthor') === 'on',
		created_by: profile.id, updated_by: profile.id,
	}).select('id').single()
	if (personError) throw new Error(`Could not create the profile: ${personError.message}`)

	const { error: translationError } = await supabase.from('people_translations').insert({
		person_id: person.id, locale: 'en', slug: english.data.slug, card_name: english.data.cardName,
		profile_document: profileDocumentFromLegacy(english.data.intro, null), seo_title: english.data.seoTitle,
		seo_description: english.data.seoDescription, status: english.data.status,
		published_at: english.data.status === 'published' ? new Date().toISOString() : null,
	})
	if (translationError) throw new Error(`The shared profile was created, but the English translation could not be saved: ${translationError.message}`)
	await replaceRoles(supabase, person.id, 'en', parseRoles([{ title: english.data.primaryRole, cardLabel: null, isCardRole: true }]))

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
