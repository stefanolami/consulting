import type { Metadata } from 'next'

import { ForgotPasswordForm } from '@/components/auth/auth-forms'

export const metadata: Metadata = {
	title: 'Recover password',
}

export default function ForgotPasswordPage() {
	return (
		<div>
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
				Account recovery
			</p>
			<h1 className="mt-3 font-robo text-4xl text-slate-950">
				Reset your password
			</h1>
			<p className="mb-8 mt-3 leading-7 text-slate-600">
				We will email a secure recovery link if the address belongs to
				an invited account.
			</p>
			<ForgotPasswordForm />
		</div>
	)
}
