import type { Metadata } from 'next'
import Link from 'next/link'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
	title: 'Our team | Time&Place Consulting',
	description: 'Meet the Time&Place Consulting team.',
}

type TeamPageProps = {
	params: Promise<{ locale: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	setRequestLocale(locale)
	const supabase = await createClient()
	const { data: translations, error: translationsError } = await supabase
		.from('people_translations')
		.select('person_id, slug, job_title, short_bio')
		.eq('locale', locale)

	if (translationsError) {
		throw new Error(`Unable to load team profiles: ${translationsError.message}`)
	}

	const personIds = (translations ?? []).map((translation) => translation.person_id)
	const { data: people, error: peopleError } = personIds.length
		? await supabase
				.from('people')
				.select('id, display_name, display_order')
				.in('id', personIds)
				.eq('is_team_member', true)
				.eq('is_active', true)
				.order('display_order')
				.order('display_name')
		: { data: [], error: null }

	if (peopleError) {
		throw new Error(`Unable to load team members: ${peopleError.message}`)
	}

	const translationsByPerson = new Map(
		(translations ?? []).map((translation) => [translation.person_id, translation]),
	)
	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`

	return (
		<main className="min-h-screen bg-white px-6 py-16 text-[#27335a] sm:px-10 lg:px-16">
			<div className="mx-auto max-w-6xl">
				<p className="font-jose text-sm font-semibold uppercase tracking-[0.2em] text-[#53617f]">
					Who we are
				</p>
				<h1 className="mt-3 font-unna text-5xl leading-tight sm:text-6xl">Our team</h1>
				<p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
					Meet the people who bring Time&amp;Place Consulting&apos;s work to life.
				</p>

				{people?.length ? (
					<div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{people.map((person) => {
							const translation = translationsByPerson.get(person.id)
							if (!translation) return null

							return (
								<Link
									className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#27335a] hover:shadow-sm"
									href={`${localePrefix}/team/${translation.slug}`}
									key={person.id}
								>
									<div className="flex size-14 items-center justify-center rounded-full bg-[#e8ebf3] font-jose text-sm font-semibold">
										{person.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}
									</div>
									<h2 className="mt-6 font-robo text-2xl">{person.display_name}</h2>
									{translation.job_title && <p className="mt-1 text-sm text-slate-600">{translation.job_title}</p>}
									{translation.short_bio && <p className="mt-4 line-clamp-3 leading-7 text-slate-600">{translation.short_bio}</p>}
								</Link>
							)
						})}
					</div>
				) : (
					<p className="mt-12 rounded-xl bg-slate-50 p-6 text-slate-600">Team profiles will appear here once they are published in this language.</p>
				)}
			</div>
		</main>
	)
}
