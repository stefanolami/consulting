'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

const personSchema = z.object({
	displayName: z.string().trim().min(2).max(160),
	stableKey: z
		.string()
		.trim()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
	jobTitle: z.string().trim().max(160).optional(),
})

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
}
