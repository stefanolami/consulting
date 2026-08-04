import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { SignInForm } from '@/components/auth/auth-forms'
import { getCurrentAccount } from '@/lib/auth/authorization'
import { getSafeRedirectPath } from '@/lib/auth/redirects'

export const metadata: Metadata = {
	title: 'Sign in',
}

type SignInPageProps = {
	searchParams: Promise<{
		authError?: string | string[]
		next?: string | string[]
	}>
}

async function SignInContent({
	searchParams,
}: SignInPageProps) {
	const params = await searchParams
	const nextValue =
		typeof params.next === 'string' ? params.next : undefined
	const nextPath = getSafeRedirectPath(nextValue)
	const initialError =
		params.authError === 'invalid-link'
			? 'This invitation or recovery link is invalid or has expired.'
			: undefined
	const account = await getCurrentAccount()

	if (account.status === 'active') {
		redirect(nextPath)
	}

	if (account.status === 'inactive') {
		redirect('/auth/access-pending')
	}

	return (
		<div>
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
				Admin portal
			</p>
			<h1 className="mt-3 font-robo text-4xl text-slate-950">
				Welcome back
			</h1>
			<p className="mb-8 mt-3 leading-7 text-slate-600">
				Sign in with your invited staff account.
			</p>
			<SignInForm initialError={initialError} nextPath={nextPath} />
			<p className="mt-8 text-center text-sm leading-6 text-slate-500">
				Accounts are created by invitation only.
			</p>
		</div>
	)
}

export default function SignInPage(props: SignInPageProps) {
	return (
		<Suspense
			fallback={
				<div
					aria-label="Loading sign in"
					className="h-96 animate-pulse rounded-2xl bg-white/60"
				/>
			}
		>
			<SignInContent {...props} />
		</Suspense>
	)
}
