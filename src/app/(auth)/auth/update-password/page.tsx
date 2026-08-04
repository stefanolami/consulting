import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { UpdatePasswordForm } from '@/components/auth/auth-forms'
import { getCurrentAccount } from '@/lib/auth/authorization'

export const metadata: Metadata = {
	title: 'Choose password',
}

async function UpdatePasswordContent() {
	const account = await getCurrentAccount()

	if (account.status === 'signed_out') {
		redirect('/auth/sign-in')
	}

	return (
		<div>
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
				Secure your account
			</p>
			<h1 className="mt-3 font-robo text-4xl text-slate-950">
				Choose a new password
			</h1>
			<p className="mb-8 mt-3 leading-7 text-slate-600">
				This password will be used for your invite-only admin account.
			</p>
			<UpdatePasswordForm />
		</div>
	)
}

export default function UpdatePasswordPage() {
	return (
		<Suspense
			fallback={
				<div
					aria-label="Loading password form"
					className="h-96 animate-pulse rounded-2xl bg-white/60"
				/>
			}
		>
			<UpdatePasswordContent />
		</Suspense>
	)
}
