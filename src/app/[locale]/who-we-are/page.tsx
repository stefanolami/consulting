import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { PageHero } from '@/components/shell/page-hero'
import { SnapshotCta } from '@/components/shell/snapshot-cta'
import { TeamCard, TeamGridSkeleton, teamGridClass, teamItemClass } from '@/components/team/team-card'
import { routing, type AppLocale } from '@/i18n/routing'
import { getPublishedTeamListing, TEAM_GROUP_ORDER, type TeamCard as TeamCardData } from '@/lib/public-team'
import { teamPath } from '@/lib/team-paths'

type WhoWeArePageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: WhoWeArePageProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	const t = await getTranslations({ locale, namespace: 'Team' })
	const canonical = teamPath(locale)
	const languages = Object.fromEntries([...routing.locales.map((entry) => [entry, teamPath(entry)]), ['x-default', teamPath(routing.defaultLocale)]])
	return { alternates: { canonical, languages }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

// Figma 5408:15 (desktop) and 5651:258 (mobile).
export default async function WhoWeArePage({ params }: WhoWeArePageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	const [t, tShell] = await Promise.all([getTranslations({ locale, namespace: 'Team' }), getTranslations({ locale, namespace: 'Shell.placeholder' })])

	return (
		<main>
			{/* PLACEHOLDER illustration: the Figma "Hero (The Team)" line drawing is not in the repository (docs/figma-asset-needs.md). */}
			<PageHero
				illustration={{ kind: 'placeholder', name: 'hero-who-we-are-team', label: tShell('illustration', { name: 'hero-who-we-are-team' }), aspectRatio: '1440 / 397' }}
				title={t('title')}
			>
				<p>{t('introduction')}</p>
				<p>{t('introductionClosing')}</p>
			</PageHero>
			<section aria-labelledby="our-team-heading" className="bg-surface-soft px-gutter py-section">
				<div className="mx-auto max-w-content">
					<h2 className="text-center font-serif text-heading-2 font-bold uppercase text-tp-blue-muted" id="our-team-heading">{t('ourTeam')}</h2>
					<Suspense fallback={<LoadingRegion className={gridWrapperClass} label={t('loading')}><TeamGridSkeleton /></LoadingRegion>}>
						<TeamGrid locale={locale} />
					</Suspense>
				</div>
			</section>
			<SnapshotCta fileHint={t('snapshot.fileHint')} label={t('snapshot.label')} />
		</main>
	)
}

const gridWrapperClass = 'mt-[clamp(2rem,1.5rem+2.5vw,4rem)] space-y-[clamp(2rem,1.5rem+2vw,3.5rem)]'

async function TeamGrid({ locale }: { locale: AppLocale }) {
	await connection()
	const [cards, t] = await Promise.all([getPublishedTeamListing(locale), getTranslations({ locale, namespace: 'Team' })])
	if (!cards.length) {
		return (
			<div className="mx-auto mt-10 max-w-2xl rounded-panel border border-dashed border-tp-mist bg-white px-6 py-12 text-center text-brand" role="status">
				<p className="font-display text-heading-3 font-bold">{t('emptyTitle')}</p>
				<p className="mt-3 font-label text-body-lg">{t('emptyDescription')}</p>
			</div>
		)
	}
	const groups = TEAM_GROUP_ORDER.map((group) => ({ group, members: cards.filter((card) => card.group === group) })).filter(({ members }) => members.length)
	return (
		<div className={gridWrapperClass}>
			{groups.map(({ group, members }) => <TeamList cards={members} key={group} label={t(`groups.${group}`)} locale={locale} />)}
		</div>
	)
}

function TeamList({ cards, label, locale }: { cards: TeamCardData[]; label: string; locale: AppLocale }) {
	return (
		<ul aria-label={label} className={teamGridClass}>
			{cards.map((card) => <li className={teamItemClass} key={card.id}><TeamCard card={card} locale={locale} /></li>)}
		</ul>
	)
}
