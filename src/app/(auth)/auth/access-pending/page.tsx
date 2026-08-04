import type { Metadata } from 'next'
import { Clock3, ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { signOutAction } from '@/app/(auth)/auth/actions'
import { Button } from '@/components/ui/button'
import { getCurrentAccount } from '@/lib/auth/authorization'

export const metadata: Metadata = {
	title: 'Access pending',
}

type AccessPendingPageProps = {
	searchParams: Promise<{ reason?: string | string[] }>
}

async function AccessPendingContent({
	searchParams,
}: AccessPendingPageProps) {
	const account = await getCurrentAccount()
	const params = await searchParams
	const isUnavailable =
		account.status === 'unavailable' ||
		params.reason === 'unavailable'

	if (account.status === 'signed_out') {
		redirect('/auth/sign-in')
	}

	if (account.status === 'active') {
		redirect('/admin')
	}

	const Icon = isUnavailable ? ShieldAlert : Clock3

	return (
		<div>
			<div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[#e6eaf3] text-[#27335a]">
				<Icon aria-hidden="true" className="size-6" />
			</div>
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
				Admin portal
			</p>
			<h1 className="mt-3 font-robo text-4xl text-slate-950">
				{isUnavailable
					? 'Access could not be verified'
					: 'Your access is pending'}
			</h1>
			<p className="mt-4 leading-7 text-slate-600">
				{isUnavailable
					? 'We could not check your staff profile. Sign out and try again, or contact an administrator if the issue continues.'
					: 'Your account exists, but an administrator still needs to activate your staff profile.'}
			</p>
			{!isUnavailable && (
				<p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
					Signed in as{' '}
					<span className="font-medium text-slate-900">
						{account.user.email ?? 'invited user'}
					</span>
				</p>
			)}
			<form action={signOutAction} className="mt-8">
				<Button
					className="h-11 w-full rounded-lg"
					type="submit"
					variant="outline"
				>
					Sign out
				</Button>
			</form>
		</div>
	)
}

export default function AccessPendingPage(props: AccessPendingPageProps) {
	return (
		<Suspense
			fallback={
				<div
					aria-label="Checking account access"
					className="h-80 animate-pulse rounded-2xl bg-white/60"
				/>
			}
		>
			<AccessPendingContent {...props} />
		</Suspense>
	)
}
