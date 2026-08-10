'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

const personSchema = z.object({
	displayName: z.string().trim().min(2).max(160),
	stableKey: z
		.string()
		.trim()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
	jobTitle: z.string().trim().max(160).optional(),
})

const optionalText = (maximum: number) =>
	z
		.string()
		.trim()
		.max(maximum)
		.optional()
		.transform((value) => value || null)

const personUpdateSchema = z.object({
	personId: z.string().uuid(),
	displayName: z.string().trim().min(2).max(160),
	stableKey: z
		.string()
		.trim()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
	email: optionalText(320).refine(
		(value) => value === null || z.string().email().safeParse(value).success,
		'Enter a valid email address.',
	),
	phone: optionalText(80),
	websiteUrl: optionalText(2048).refine(
		(value) => value === null || z.string().url().safeParse(value).success,
		'Enter a valid website URL.',
	),
	displayOrder: z.coerce.number().int().min(0).max(100000),
})

const translationSchema = z.object({
	personId: z.string().uuid(),
	locale: z.enum(['en', 'de', 'it', 'pt-BR', 'pt-PT']),
	slug: z
		.string()
		.trim()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
	jobTitle: optionalText(160),
	shortBio: optionalText(1000),
	biography: optionalText(20000),
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

function textToDocument(text: string | null): Json {
	if (!text) return { type: 'doc', content: [] }

	return {
		type: 'doc',
		content: text.split(/\n{2,}/).map((paragraph) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }],
		})),
	}
}

export async function signOutAction() {
	const supabase = await createClient()
	await supabase.auth.signOut()
	redirect('/auth/sign-in')
}

export async function createPersonAction(formData: FormData) {
	const parsed = personSchema.safeParse({
		displayName: formData.get('displayName'),
		stableKey: formData.get('stableKey'),
		jobTitle: formData.get('jobTitle') || undefined,
	})

	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? 'Enter a valid profile.')
	}

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: person, error: personError } = await supabase
		.from('people')
		.insert({
			display_name: parsed.data.displayName,
			stable_key: parsed.data.stableKey,
			created_by: profile.id,
			updated_by: profile.id,
		})
		.select('id')
		.single()

	if (personError) {
		throw new Error(`Could not create the profile: ${personError.message}`)
	}

	const { error: translationError } = await supabase
		.from('people_translations')
		.insert({
			person_id: person.id,
			locale: 'en',
			slug: parsed.data.stableKey,
			job_title: parsed.data.jobTitle || null,
		})

	if (translationError) {
		await supabase.from('people').delete().eq('id', person.id)
		throw new Error(
			`Could not create the English profile translation: ${translationError.message}`,
		)
	}

	revalidatePath('/admin')
	revalidatePath('/admin/people')
	redirect(`/admin/people/${person.id}`)
}

export async function updatePersonAction(formData: FormData) {
	const parsed = personUpdateSchema.safeParse({
		personId: formData.get('personId'),
		displayName: formData.get('displayName'),
		stableKey: formData.get('stableKey'),
		email: formData.get('email') || undefined,
		phone: formData.get('phone') || undefined,
		websiteUrl: formData.get('websiteUrl') || undefined,
		displayOrder: formData.get('displayOrder'),
	})
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Enter valid profile details.')

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { error } = await supabase
		.from('people')
		.update({
			display_name: parsed.data.displayName,
			stable_key: parsed.data.stableKey,
			email: parsed.data.email,
			phone: parsed.data.phone,
			website_url: parsed.data.websiteUrl,
			display_order: parsed.data.displayOrder,
			is_team_member: formData.get('isTeamMember') === 'on',
			is_author: formData.get('isAuthor') === 'on',
			updated_by: profile.id,
		})
		.eq('id', parsed.data.personId)

	if (error) throw new Error(`Could not save the profile: ${error.message}`)
	await refreshPersonPaths(supabase, parsed.data.personId)
}

export async function savePersonTranslationAction(formData: FormData) {
	const parsed = translationSchema.safeParse({
		personId: formData.get('personId'),
		locale: formData.get('locale'),
		slug: formData.get('slug'),
		jobTitle: formData.get('jobTitle') || undefined,
		shortBio: formData.get('shortBio') || undefined,
		biography: formData.get('biography') || undefined,
		seoTitle: formData.get('seoTitle') || undefined,
		seoDescription: formData.get('seoDescription') || undefined,
		status: formData.get('status'),
	})
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Enter valid translation details.')

	const supabase = await createClient()
	const { error } = await supabase.from('people_translations').upsert(
		{
			person_id: parsed.data.personId,
			locale: parsed.data.locale,
			slug: parsed.data.slug,
			job_title: parsed.data.jobTitle,
			short_bio: parsed.data.shortBio,
			content: textToDocument(parsed.data.biography),
			seo_title: parsed.data.seoTitle,
			seo_description: parsed.data.seoDescription,
			status: parsed.data.status,
			published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
			scheduled_for: null,
		},
		{ onConflict: 'person_id,locale' },
	)

	if (error) throw new Error(`Could not save the translation: ${error.message}`)
	await refreshPersonPaths(supabase, parsed.data.personId)
}

export async function setPersonArchivedAction(formData: FormData) {
	const personId = z.string().uuid().safeParse(formData.get('personId'))
	const isArchived = formData.get('isArchived') === 'true'
	if (!personId.success) throw new Error('Invalid profile.')

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { error } = await supabase
		.from('people')
		.update({ is_active: !isArchived, updated_by: profile.id })
		.eq('id', personId.data)
	if (error) throw new Error(`Could not ${isArchived ? 'archive' : 'restore'} this profile: ${error.message}`)
	await refreshPersonPaths(supabase, personId.data)
}

export async function movePersonAction(formData: FormData) {
	const personId = z.string().uuid().safeParse(formData.get('personId'))
	const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'))
	if (!personId.success || !direction.success) throw new Error('Invalid ordering request.')

	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: people, error: peopleError } = await supabase
		.from('people')
		.select('id')
		.eq('is_team_member', true)
		.order('display_order')
		.order('display_name')
	if (peopleError) throw new Error(`Could not load team order: ${peopleError.message}`)

	const currentIndex = (people ?? []).findIndex((person) => person.id === personId.data)
	const destinationIndex = currentIndex + (direction.data === 'up' ? -1 : 1)
	if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= (people?.length ?? 0)) return

	const orderedIds = (people ?? []).map((person) => person.id)
	;[orderedIds[currentIndex], orderedIds[destinationIndex]] = [orderedIds[destinationIndex], orderedIds[currentIndex]]

	const updates = await Promise.all(
		orderedIds.map((id, displayOrder) =>
			supabase
				.from('people')
				.update({ display_order: displayOrder, updated_by: profile.id })
				.eq('id', id),
		),
	)
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
	const { data: media, error: mediaError } = await supabase
		.from('media_assets')
		.insert({
			object_path: parsed.data.objectPath,
			original_filename: parsed.data.originalFilename,
			mime_type: parsed.data.mimeType,
			file_size_bytes: parsed.data.fileSizeBytes,
			width: parsed.data.width,
			height: parsed.data.height,
			uploaded_by: profile.id,
		})
		.select('id')
		.single()
	if (mediaError) throw new Error(`The file uploaded, but its media record could not be created: ${mediaError.message}`)

	const { error: translationError } = await supabase.from('media_asset_translations').insert({
		media_asset_id: media.id,
		locale: 'en',
		alt_text: parsed.data.altText,
	})
	if (translationError) throw new Error(`The file uploaded, but its alt text could not be saved: ${translationError.message}`)

	const { error: personError } = await supabase
		.from('people')
		.update({ portrait_media_id: media.id, updated_by: profile.id })
		.eq('id', parsed.data.personId)
	if (personError) throw new Error(`The media was created, but could not be attached: ${personError.message}`)
	await refreshPersonPaths(supabase, parsed.data.personId)
}

async function refreshPersonPaths(
	supabase: Awaited<ReturnType<typeof createClient>>,
	personId: string,
) {
	revalidatePath('/admin')
	revalidatePath('/admin/people')
	revalidatePath(`/admin/people/${personId}`)
	revalidatePath('/team')
	for (const locale of ['de', 'it', 'pt-BR', 'pt-PT']) revalidatePath(`/${locale}/team`)

	const { data: translations } = await supabase
		.from('people_translations')
		.select('locale, slug')
		.eq('person_id', personId)
	for (const translation of translations ?? []) {
		const prefix = translation.locale === 'en' ? '' : `/${translation.locale}`
		revalidatePath(`${prefix}/team/${translation.slug}`)
	}
}
