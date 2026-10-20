'use client'

import { RotateCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

// The admin's error boundary (audit X-02): an unexpected error in an admin
// page shows this panel inside the admin shell, with a retry and a way back,
// instead of "This page couldn't load".
export default function AdminError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="mx-auto max-w-2xl">
			<section aria-labelledby="admin-error-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Something went wrong</p>
				<h1 className="mt-2 font-robo text-3xl tracking-tight text-slate-950" id="admin-error-title">This admin page could not be shown</h1>
				<p className="mt-3 leading-7 text-slate-600">An unexpected error stopped the page. Saved content is not affected. Try again; if the error comes back, go back to the previous page and tell the website team what you were doing.</p>
				{error.digest ? <p className="mt-3 text-sm text-slate-500">Reference for the website team: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">{error.digest}</code></p> : null}
				<div className="mt-6 flex flex-wrap gap-3">
					<Button onClick={() => unstable_retry()} type="button"><RotateCw aria-hidden="true" />Try again</Button>
					<Button onClick={() => window.history.back()} type="button" variant="outline">Go back</Button>
					<Button asChild variant="outline"><Link href="/admin">Admin dashboard</Link></Button>
				</div>
			</section>
		</div>
	)
}
