import type { Metadata } from 'next'
import { Languages } from 'lucide-react'

import { PeoplePreview } from '@/components/admin/people-preview'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
	title: 'People',
}

export default async function PeoplePage() {
	const supabase = await createClient()
	const [{ data: people, error: peopleError }, { data: translations, error: translationsError }] =
		await Promise.all([
			supabase
				.from('people')
				.select('id, display_name, display_order, is_active')
				.eq('is_team_member', true)
				.order('display_order')
				.order('display_name'),
			supabase
				.from('people_translations')
				.select('person_id, locale, job_title, status')
				.order('locale'),
		])

	if (peopleError || translationsError) {
		throw new Error(
			`Unable to load team profiles: ${peopleError?.message ?? translationsError?.message}`,
		)
	}

	const profiles = (people ?? []).map((person) => {
		const personTranslations = (translations ?? []).filter(
			(translation) => translation.person_id === person.id,
		)
		const english = personTranslations.find(
			(translation) => translation.locale === 'en',
		)

		return {
			id: person.id,
			name: person.display_name,
			role: english?.job_title ?? 'No English title yet',
			locales: personTranslations.map((translation) => translation.locale),
			status: english?.status ?? 'draft',
			isActive: person.is_active,
		}
	})
	const publishedCount = profiles.filter((profile) => profile.status === 'published').length
	const translatedCount = profiles.filter((profile) => profile.locales.length === 5).length

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
				<SummaryCard label="Team profiles" value={String(profiles.length)} />
				<SummaryCard label="Published in English" value={String(publishedCount)} tone="success" />
				<SummaryCard label="Fully translated" value={`${translatedCount}/${profiles.length}`} icon />
			</div>

			<section className="mt-10" aria-labelledby="profiles-heading">
				<h2 className="sr-only" id="profiles-heading">Team profiles</h2>
				<PeoplePreview initialMembers={profiles} />
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
