import type { Metadata } from 'next'
import Link from 'next/link'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

type TeamMemberPageProps = {
	params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: TeamMemberPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}

	const supabase = await createClient()
	const { data } = await supabase
		.from('people_translations')
		.select('seo_title, seo_description, job_title')
		.eq('locale', locale)
		.eq('slug', slug)
		.maybeSingle()

	return {
		title: data?.seo_title ?? data?.job_title ?? 'Team member | Time&Place Consulting',
		description: data?.seo_description ?? undefined,
	}
}

export default async function TeamMemberPage({ params }: TeamMemberPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	setRequestLocale(locale)
	const supabase = await createClient()
	const { data: translation, error: translationError } = await supabase
		.from('people_translations')
		.select('person_id, job_title, short_bio, seo_title, seo_description')
		.eq('locale', locale)
		.eq('slug', slug)
		.maybeSingle()

	if (translationError) {
		throw new Error(`Unable to load this team profile: ${translationError.message}`)
	}
	if (!translation) notFound()

	const { data: person, error: personError } = await supabase
		.from('people')
		.select('display_name, email, phone, website_url')
		.eq('id', translation.person_id)
		.eq('is_team_member', true)
		.eq('is_active', true)
		.maybeSingle()

	if (personError) {
		throw new Error(`Unable to load this team member: ${personError.message}`)
	}
	if (!person) notFound()

	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`

	return (
		<main className="min-h-screen bg-white px-6 py-16 text-[#27335a] sm:px-10 lg:px-16">
			<article className="mx-auto max-w-3xl">
				<Link className="font-jose text-sm font-semibold uppercase tracking-[0.16em] text-[#53617f] underline-offset-4 hover:underline" href={`${localePrefix}/team`}>
					Our team
				</Link>
				<div className="mt-10 flex size-24 items-center justify-center rounded-full bg-[#e8ebf3] font-jose text-2xl font-semibold">
					{person.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}
				</div>
				<h1 className="mt-7 font-unna text-5xl leading-tight sm:text-6xl">{person.display_name}</h1>
				{translation.job_title && <p className="mt-3 font-robo text-2xl text-slate-600">{translation.job_title}</p>}
				{translation.short_bio && <p className="mt-8 whitespace-pre-line text-lg leading-8 text-slate-700">{translation.short_bio}</p>}
				{(person.email || person.phone || person.website_url) && (
					<dl className="mt-10 space-y-3 border-t border-slate-200 pt-7 text-slate-700">
						{person.email && <div><dt className="sr-only">Email</dt><dd><a className="underline underline-offset-4" href={`mailto:${person.email}`}>{person.email}</a></dd></div>}
						{person.phone && <div><dt className="sr-only">Phone</dt><dd><a className="underline underline-offset-4" href={`tel:${person.phone}`}>{person.phone}</a></dd></div>}
						{person.website_url && <div><dt className="sr-only">Website</dt><dd><a className="underline underline-offset-4" href={person.website_url} rel="noreferrer" target="_blank">Website</a></dd></div>}
					</dl>
				)}
			</article>
		</main>
	)
}
