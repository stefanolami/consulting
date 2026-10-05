import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Endorsements } from '@/components/endorsements/endorsements-section'
import { PageHero } from '@/components/shell/page-hero'
import { routing, type AppLocale } from '@/i18n/routing'

import { CountUp } from './count-up'

export function whyUsPath(locale: AppLocale) {
	return locale === routing.defaultLocale ? '/why-us' : `/${locale}/why-us`
}

export async function generateWhyUsMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'WhyUs' })
	const canonical = whyUsPath(locale)
	const languages = Object.fromEntries([...routing.locales.map((entry) => [entry, whyUsPath(entry)]), ['x-default', whyUsPath(routing.defaultLocale)]])
	return { alternates: { canonical, languages }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

// PROVISIONAL figures: Figma shows "XX". Languages are the fourteen listed
// under "Languages"; countries and continents are those of the offices listed
// under "Geographic presence" (Europe, Asia, South America). To be confirmed
// by the product owner (control tower §15.8).
const FIGURES = { languages: 14, countries: 10, continents: 3 } as const

const OVERVIEW = ['reputation', 'languages', 'integrity', 'presence', 'expertise', 'experience'] as const
const CODEX = ['opportunities', 'billableDays', 'honesty', 'whoYouMeet', 'conflicts'] as const

const SECTION_ROOT_HEADING = 'font-serif text-heading-2 font-bold uppercase'
const TOPIC_HEADING = 'font-display text-heading-3 font-bold'
const BODY = 'mt-[clamp(0.75rem,0.6rem+0.5vw,1.25rem)] font-label text-body-lg font-medium'
const TOPICS = 'space-y-[clamp(2rem,1.6rem+1.5vw,3rem)]'

// Figma 5408:311 (desktop) and 5651:450 (mobile); copy from the legacy Why Us
// page. Everything is static except the endorsements, which stream from the
// CMS and disappear when the locale has none.
export async function WhyUsPage({ locale }: { locale: AppLocale }) {
	const [t, tShell] = await Promise.all([
		getTranslations({ locale, namespace: 'WhyUs' }),
		getTranslations({ locale, namespace: 'Shell.placeholder' }),
	])
	const figureValues = { languageCount: FIGURES.languages, countryCount: FIGURES.countries, continentCount: FIGURES.continents }
	const countUp = (value: number) => function CountUpChunk(chunks: ReactNode) {
		return <CountUp locale={locale} value={value}>{String(chunks)}</CountUp>
	}

	return (
		<main>
			{/* PLACEHOLDER illustration: the Figma laptop-and-coffee line drawing is not in the repository (docs/figma-asset-needs.md). */}
			<PageHero
				illustration={{ kind: 'placeholder', name: 'hero-why-us-laptop', label: tShell('illustration', { name: 'hero-why-us-laptop' }), aspectRatio: '1440 / 480' }}
				title={t('title')}
			/>
			<div className="bg-surface-soft px-gutter py-section text-tp-blue-muted">
				<p className="mx-auto max-w-content text-balance text-center font-serif text-[clamp(1.5rem,0.95rem+2.3vw,2.6875rem)] font-black uppercase italic leading-[1.15] text-tp-blue">
					<span className="sr-only">{t.markup('figures', { ...figureValues, languages: (chunks) => chunks, countries: (chunks) => chunks, continents: (chunks) => chunks })}</span>
					<span aria-hidden="true">
						{t.rich('figures', { ...figureValues, languages: countUp(FIGURES.languages), countries: countUp(FIGURES.countries), continents: countUp(FIGURES.continents) })}
					</span>
				</p>
				<div className={`mx-auto mt-[clamp(3rem,2rem+4vw,6rem)] max-w-content ${TOPICS}`}>
					{OVERVIEW.map((key) => (
						<section aria-labelledby={`why-us-${key}`} key={key}>
							<h2 className={TOPIC_HEADING} id={`why-us-${key}`}>{t(`overview.${key}.title`)}</h2>
							<p className={BODY}>{t(`overview.${key}.body`)}</p>
							{key === 'presence' ? <p className={BODY}>{t('overview.presence.offices')}</p> : null}
						</section>
					))}
				</div>
			</div>
			<section aria-labelledby="client-codex-heading" className="bg-tp-blue-muted px-gutter py-section text-on-brand">
				<div className="mx-auto max-w-content">
					<h2 className={`${SECTION_ROOT_HEADING} text-center`} id="client-codex-heading">{t('codex.title')}</h2>
					<p className={`${BODY} mt-[clamp(1.5rem,1rem+2vw,3rem)]`}>{t('codex.introduction')}</p>
					<div className={`mt-[clamp(2rem,1.6rem+1.5vw,3rem)] ${TOPICS}`}>
						{CODEX.map((key) => (
							<div key={key}>
								<h3 className={TOPIC_HEADING}>{t(`codex.principles.${key}.title`)}</h3>
								<p className={BODY}>{t(`codex.principles.${key}.body`)}</p>
							</div>
						))}
					</div>
				</div>
			</section>
			<Endorsements locale={locale} />
		</main>
	)
}
