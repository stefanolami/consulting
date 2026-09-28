import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { AuthorArticles } from '@/components/team/author-articles'
import { ProfileContact } from '@/components/team/profile-contact'
import { ProfileSections } from '@/components/team/profile-document'
import { ProfileHero } from '@/components/team/profile-hero'
import { routing } from '@/i18n/routing'
import { getPublishedTeamProfile } from '@/lib/public-team'
import { teamPath } from '@/lib/team-paths'

type TeamMemberPageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: TeamMemberPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	await connection()
	const profile = await getPublishedTeamProfile(locale, slug)
	if (!profile) return { robots: { follow: false, index: false } }
	const canonical = teamPath(locale, profile.slug)
	const languages: Record<string, string> = Object.fromEntries(profile.alternates.map((alternate) => [alternate.locale, teamPath(alternate.locale, alternate.slug)]))
	const english = profile.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = teamPath(routing.defaultLocale, english.slug)
	const title = profile.seoTitle || profile.name
	const description = profile.seoDescription || undefined
	return { alternates: { canonical, languages }, description, openGraph: { description, title, type: 'profile', url: canonical }, title }
}

// One template for every profile (Figma 5494:162, 5408:536, 5494:891,
// 5494:972); sections, endorsements, contact and articles are all optional.
// The slug is request data under Cache Components, so it is read inside the
// Suspense boundary.
export default function TeamMemberPage({ params }: TeamMemberPageProps) {
	return <Suspense fallback={<ProfileFallback />}><TeamMemberContent params={params} /></Suspense>
}

async function TeamMemberContent({ params }: TeamMemberPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	await connection()
	const [profile, t] = await Promise.all([getPublishedTeamProfile(locale, slug), getTranslations({ locale, namespace: 'Team.profile' })])
	if (!profile) notFound()
	return (
		<main>
			<article>
				<ProfileHero portraitAlt={profile.portrait?.alt || t('portraitAlt', { name: profile.name })} profile={profile} />
				<div className="mx-auto max-w-content space-y-[clamp(3rem,2.25rem+3vw,5.5rem)] px-gutter py-section">
					<ProfileSections document={profile.document} />
					<ProfileContact email={profile.email} labels={{ email: t('email'), heading: t('contact'), phone: t('phone') }} phone={profile.phone} />
					<Suspense fallback={null}>
						<AuthorArticles locale={locale} name={profile.name} personId={profile.id} />
					</Suspense>
				</div>
			</article>
		</main>
	)
}

function ProfileFallback() {
	return (
		<main aria-busy="true">
			<div className="bg-brand">
				<div className="mx-auto max-w-content px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)]">
					<div className="h-[clamp(5rem,4rem+4vw,9rem)] max-w-xl rounded-control bg-on-brand/10 motion-safe:animate-pulse" />
				</div>
			</div>
		</main>
	)
}
