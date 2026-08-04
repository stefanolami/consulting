'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getSafeRedirectPath } from '@/lib/auth/redirects'
import { createClient } from '@/lib/supabase/server'

export type AuthActionState = {
	status: 'idle' | 'error' | 'success'
	message?: string
	fieldErrors?: {
		email?: string[]
		password?: string[]
		passwordConfirmation?: string[]
	}
}

const signInSchema = z.object({
	email: z.string().trim().email('Enter a valid email address.'),
	password: z.string().min(1, 'Enter your password.'),
	next: z.string().optional(),
})

const forgotPasswordSchema = z.object({
	email: z.string().trim().email('Enter a valid email address.'),
})

const updatePasswordSchema = z
	.object({
		password: z
			.string()
			.min(12, 'Use at least 12 characters for your password.'),
		passwordConfirmation: z.string(),
	})
	.refine((values) => values.password === values.passwordConfirmation, {
		message: 'The passwords do not match.',
		path: ['passwordConfirmation'],
	})

function getFieldErrors(error: z.ZodError) {
	const fields = error.flatten().fieldErrors as Record<
		string,
		string[] | undefined
	>

	return {
		email: fields.email,
		password: fields.password,
		passwordConfirmation: fields.passwordConfirmation,
	}
}

async function getRequestOrigin() {
	const requestHeaders = await headers()
	const origin = requestHeaders.get('origin')

	if (origin) {
		return origin
	}

	const host =
		requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
	const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'

	return host ? `${protocol}://${host}` : null
}

export async function signInAction(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const parsed = signInSchema.safeParse({
		email: formData.get('email'),
		password: formData.get('password'),
		next: formData.get('next') || undefined,
	})

	if (!parsed.success) {
		return {
			status: 'error',
			message: 'Check the highlighted fields and try again.',
			fieldErrors: getFieldErrors(parsed.error),
		}
	}

	const supabase = await createClient()
	const { data, error } = await supabase.auth.signInWithPassword({
		email: parsed.data.email,
		password: parsed.data.password,
	})

	if (error || !data.user) {
		return {
			status: 'error',
			message: 'The email address or password was not recognized.',
		}
	}

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('is_active')
		.eq('id', data.user.id)
		.maybeSingle()

	if (profileError) {
		redirect('/auth/access-pending?reason=unavailable')
	}

	if (!profile?.is_active) {
		redirect('/auth/access-pending')
	}

	redirect(getSafeRedirectPath(parsed.data.next))
}

export async function forgotPasswordAction(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const parsed = forgotPasswordSchema.safeParse({
		email: formData.get('email'),
	})

	if (!parsed.success) {
		return {
			status: 'error',
			message: 'Check the highlighted field and try again.',
			fieldErrors: getFieldErrors(parsed.error),
		}
	}

	const origin = await getRequestOrigin()

	if (!origin) {
		return {
			status: 'error',
			message: 'Password recovery is temporarily unavailable.',
		}
	}

	const supabase = await createClient()

	// Always show the same response so this form does not disclose staff accounts.
	await supabase.auth.resetPasswordForEmail(parsed.data.email, {
		redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
			'/auth/update-password',
		)}`,
	})

	return {
		status: 'success',
		message:
			'If that address belongs to an invited account, a recovery link is on its way.',
	}
}

export async function updatePasswordAction(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const parsed = updatePasswordSchema.safeParse({
		password: formData.get('password'),
		passwordConfirmation: formData.get('passwordConfirmation'),
	})

	if (!parsed.success) {
		return {
			status: 'error',
			message: 'Check the highlighted fields and try again.',
			fieldErrors: getFieldErrors(parsed.error),
		}
	}

	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return {
			status: 'error',
			message: 'This link is invalid or has expired. Request a new one.',
		}
	}

	const { error } = await supabase.auth.updateUser({
		password: parsed.data.password,
	})

	if (error) {
		return {
			status: 'error',
			message: 'The password could not be updated. Request a new link.',
		}
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('is_active')
		.eq('id', user.id)
		.maybeSingle()

	redirect(profile?.is_active ? '/admin' : '/auth/access-pending')
}

export async function signOutAction() {
	const supabase = await createClient()
	await supabase.auth.signOut()
	redirect('/auth/sign-in')
}
