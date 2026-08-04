import type { Metadata } from 'next'
import { Languages } from 'lucide-react'

import { PeoplePreview } from '@/components/admin/people-preview'

export const metadata: Metadata = {
	title: 'People',
}

export default function PeoplePage() {
	return (
		<div className="mx-auto max-w-6xl">
			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
						People and team
					</p>
					<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">
						Team directory
					</h1>
					<p className="mt-3 max-w-2xl leading-7 text-slate-600">
						Manage profiles, translations and publishing status from one
						place.
					</p>
				</div>
			</div>

			<div className="mt-9 grid gap-4 sm:grid-cols-3">
				<SummaryCard label="Team profiles" value="3" />
				<SummaryCard label="Published" value="2" tone="success" />
				<SummaryCard label="Translation coverage" value="67%" icon />
			</div>

			<section className="mt-10" aria-labelledby="profiles-heading">
				<h2 className="sr-only" id="profiles-heading">Team profiles</h2>
				<PeoplePreview />
			</section>
		</div>
	)
}

function SummaryCard({
	label,
	value,
	tone = 'default',
	icon = false,
}: {
	label: string
	value: string
	tone?: 'default' | 'success'
	icon?: boolean
}) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<p className="flex items-center gap-2 text-sm text-slate-500">
				{icon && <Languages aria-hidden="true" className="size-4" />}
				{label}
			</p>
			<p className={tone === 'success' ? 'mt-2 text-3xl font-semibold text-emerald-600' : 'mt-2 text-3xl font-semibold text-slate-950'}>
				{value}
			</p>
		</div>
	)
}
