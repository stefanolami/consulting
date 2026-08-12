import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Our team | Time&Place Consulting', description: 'Meet the Time&Place Consulting team.' }
type TeamPageProps = { params: Promise<{ locale: string }> }

export default async function TeamPage({ params }: TeamPageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <Suspense fallback={<TeamPageFallback />}><TeamPageContent locale={locale} /></Suspense>
}

async function TeamPageContent({ locale }: { locale: string }) {
	await connection()
	const supabase = await createClient()
	const now = new Date().toISOString()
	const { data: translations, error: translationsError } = await supabase.from('people_translations').select('person_id, slug, card_name').eq('locale', locale).eq('status', 'published').lte('published_at', now)
	if (translationsError) throw new Error(`Unable to load team profiles: ${translationsError.message}`)
	const personIds = (translations ?? []).map((translation) => translation.person_id)
	const { data: people, error: peopleError } = personIds.length ? await supabase.from('people').select('id, display_name, display_order, team_group, portrait_media_id').in('id', personIds).eq('is_team_member', true).eq('is_active', true).order('team_group').order('display_order').order('display_name') : { data: [], error: null }
	if (peopleError) throw new Error(`Unable to load team members: ${peopleError.message}`)
	const portraitIds = (people ?? []).flatMap((person) => person.portrait_media_id ? [person.portrait_media_id] : [])
	const [{ data: portraits, error: portraitsError }, { data: roles, error: rolesError }, { data: altTexts, error: altTextsError }] = await Promise.all([
		portraitIds.length ? supabase.from('media_assets').select('id, object_path').in('id', portraitIds) : Promise.resolve({ data: [], error: null }),
		personIds.length ? supabase.from('people_profile_roles').select('person_id, title, card_label').in('person_id', personIds).eq('locale', locale).eq('is_card_role', true) : Promise.resolve({ data: [], error: null }),
		portraitIds.length ? supabase.from('media_asset_translations').select('media_asset_id, locale, alt_text').in('media_asset_id', portraitIds).in('locale', [locale, 'en']) : Promise.resolve({ data: [], error: null }),
	])
	if (portraitsError || rolesError || altTextsError) throw new Error(`Unable to load team card media: ${portraitsError?.message ?? rolesError?.message ?? altTextsError?.message}`)
	const translationsByPerson = new Map((translations ?? []).map((translation) => [translation.person_id, translation]))
	const portraitsById = new Map((portraits ?? []).map((portrait) => [portrait.id, portrait.object_path]))
	const cardRoleByPerson = new Map((roles ?? []).map((role) => [role.person_id, role]))
	const localizedAltTextByMediaId = new Map<string, string>()
	const englishAltTextByMediaId = new Map<string, string>()
	for (const altText of altTexts ?? []) {
		if (altText.locale === locale) localizedAltTextByMediaId.set(altText.media_asset_id, altText.alt_text)
		if (altText.locale === 'en') englishAltTextByMediaId.set(altText.media_asset_id, altText.alt_text)
	}
	const groups = [{ key: 'managing_team', label: 'Managing team' }, { key: 'team', label: 'Team' }] as const
	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`

	return <main className="min-h-screen bg-white px-6 py-16 text-[#27335a] sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl"><p className="font-jose text-sm font-semibold uppercase tracking-[0.2em] text-[#53617f]">Who we are</p><h1 className="mt-3 font-unna text-5xl leading-tight sm:text-6xl">Our team</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Meet the people who bring Time&amp;Place Consulting&apos;s work to life.</p>{people?.length ? groups.map((group) => { const members = people.filter((person) => person.team_group === group.key); return members.length ? <section className="mt-14" key={group.key}><h2 className="font-unna text-3xl text-[#27335a] sm:text-4xl">{group.label}</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{members.map((person) => { const translation = translationsByPerson.get(person.id); if (!translation) return null; const portraitPath = person.portrait_media_id ? portraitsById.get(person.portrait_media_id) : null; const portraitUrl = portraitPath ? supabase.storage.from('public-media').getPublicUrl(portraitPath).data.publicUrl : null; const cardRole = cardRoleByPerson.get(person.id); const portraitAlt = person.portrait_media_id ? localizedAltTextByMediaId.get(person.portrait_media_id) ?? englishAltTextByMediaId.get(person.portrait_media_id) : null; return <Link className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#27335a] hover:shadow-sm" href={`${localePrefix}/team/${translation.slug}`} key={person.id}>{portraitUrl ? <Image alt={portraitAlt || `Portrait of ${person.display_name}`} className="size-20 rounded-full object-cover" height={80} src={portraitUrl} width={80} /> : <div className="flex size-20 items-center justify-center rounded-full bg-[#e8ebf3] font-jose text-lg font-semibold">{initials(person.display_name)}</div>}<h3 className="mt-6 font-robo text-2xl">{translation.card_name || person.display_name}</h3>{cardRole && <p className="mt-1 text-sm text-slate-600">{cardRole.card_label || cardRole.title}</p>}</Link> })}</div></section> : null }) : <p className="mt-12 rounded-xl bg-slate-50 p-6 text-slate-600">Team profiles will appear here once they are published in this language.</p>}</div></main>
}

function TeamPageFallback() { return <main className="min-h-screen bg-white px-6 py-16 sm:px-10 lg:px-16" /> }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2) }
