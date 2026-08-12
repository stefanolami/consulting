import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { TeamProfileDocument } from '@/components/team/profile-document'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { profileDocumentFromLegacy } from '@/lib/team-profile-document'

type TeamMemberPageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: TeamMemberPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	const supabase = await createClient()
	const { data } = await supabase.from('people_translations').select('seo_title, seo_description').eq('locale', locale).eq('slug', slug).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle()
	return { title: data?.seo_title ?? 'Team member | Time&Place Consulting', description: data?.seo_description ?? undefined }
}

export default function TeamMemberPage({ params }: TeamMemberPageProps) { return <Suspense fallback={<TeamMemberPageFallback />}><TeamMemberPageContent params={params} /></Suspense> }

async function TeamMemberPageContent({ params }: TeamMemberPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	await connection(); setRequestLocale(locale)
	const supabase = await createClient(); const now = new Date().toISOString()
	const { data: translation, error: translationError } = await supabase.from('people_translations').select('person_id, card_name, profile_document, short_bio, content, seo_title, seo_description').eq('locale', locale).eq('slug', slug).eq('status', 'published').lte('published_at', now).maybeSingle()
	if (translationError) throw new Error(`Unable to load this team profile: ${translationError.message}`)
	if (!translation) notFound()
	const { data: person, error: personError } = await supabase.from('people').select('display_name, email, phone, portrait_media_id').eq('id', translation.person_id).eq('is_team_member', true).eq('is_active', true).maybeSingle()
	if (personError) throw new Error(`Unable to load this team member: ${personError.message}`)
	if (!person) notFound()
	const [{ data: portrait }, { data: portraitAltRows }, { data: roles, error: rolesError }] = await Promise.all([
		person.portrait_media_id ? supabase.from('media_assets').select('object_path').eq('id', person.portrait_media_id).maybeSingle() : Promise.resolve({ data: null }),
		person.portrait_media_id ? supabase.from('media_asset_translations').select('locale, alt_text').eq('media_asset_id', person.portrait_media_id).in('locale', [locale, 'en']) : Promise.resolve({ data: [] }),
		supabase.from('people_profile_roles').select('title').eq('person_id', translation.person_id).eq('locale', locale).order('display_order'),
	])
	if (rolesError) throw new Error(`Unable to load profile roles: ${rolesError.message}`)
	const portraitUrl = portrait ? supabase.storage.from('public-media').getPublicUrl(portrait.object_path).data.publicUrl : null
	const portraitAlt = (portraitAltRows ?? []).find((entry) => entry.locale === locale)?.alt_text ?? (portraitAltRows ?? []).find((entry) => entry.locale === 'en')?.alt_text
	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`
	const profileDocument = translation.profile_document || profileDocumentFromLegacy(translation.short_bio, null)

	return <main className="min-h-screen bg-white px-6 py-16 text-[#27335a] sm:px-10 lg:px-16"><article className="mx-auto max-w-3xl"><Link className="font-jose text-sm font-semibold uppercase tracking-[0.16em] text-[#53617f] underline-offset-4 hover:underline" href={`${localePrefix}/team`}>Our team</Link><div className="mt-10 flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="font-unna text-5xl leading-tight sm:text-6xl">{translation.card_name || person.display_name}</h1>{roles?.length ? <ul className="mt-5 space-y-1 font-robo text-lg italic text-slate-600">{roles.map((role, index) => <li key={index}>{role.title}</li>)}</ul> : null}</div>{portraitUrl ? <Image alt={portraitAlt || `Portrait of ${person.display_name}`} className="size-32 rounded-full object-cover sm:size-40" height={160} src={portraitUrl} width={160} /> : <div className="flex size-32 items-center justify-center rounded-full bg-[#e8ebf3] font-jose text-3xl font-semibold sm:size-40">{person.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>}</div><div className="mt-10"><TeamProfileDocument content={profileDocument} /></div>{(person.email || person.phone) && <dl className="mt-12 space-y-3 border-t border-slate-200 pt-7 text-slate-700">{person.email && <div><dt className="sr-only">Email</dt><dd><a className="underline underline-offset-4" href={`mailto:${person.email}`}>{person.email}</a></dd></div>}{person.phone && <div><dt className="sr-only">Phone</dt><dd><a className="underline underline-offset-4" href={`tel:${person.phone}`}>{person.phone}</a></dd></div>}</dl>}</article></main>
}

function TeamMemberPageFallback() { return <main className="min-h-screen bg-white px-6 py-16 sm:px-10 lg:px-16" /> }
