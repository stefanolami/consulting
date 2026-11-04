import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { AppLocale } from '@/i18n/routing'

import { CountUp } from './count-up'

// PROVISIONAL figures: Figma shows "XX". Languages are the fourteen listed
// under "Languages"; countries and continents are those of the offices listed
// under "Geographic presence" (Europe, Asia, South America). To be confirmed
// by the product owner (control tower §15.4).
const FIGURES = { languages: 14, countries: 10, continents: 3 } as const

const OVERVIEW = ['reputation', 'languages', 'integrity', 'presence', 'expertise', 'experience'] as const
const CODEX = ['opportunities', 'billableDays', 'honesty', 'whoYouMeet', 'conflicts'] as const

const SECTION_HEADING = 'text-center font-serif text-heading-2 font-bold uppercase'
const TOPIC_HEADING = 'font-display text-heading-3 font-bold'
const BODY = 'mt-[clamp(0.75rem,0.6rem+0.5vw,1.25rem)] font-label text-body-lg font-medium'
const TOPICS = 'space-y-[clamp(2rem,1.6rem+1.5vw,3rem)]'

// The former Why Us page (Figma 5408:311 and 5651:450), merged into Who We Are
// on 2026-11-04: the figures statement and six topics, two columns from lg
// and one reading column below. `/why-us` redirects to this section's anchor.
export async function WhyUsSection({ locale }: { locale: AppLocale }) {
	const t = await getTranslations({ locale, namespace: 'WhyUs' })
	const figureValues = { languageCount: FIGURES.languages, countryCount: FIGURES.countries, continentCount: FIGURES.continents }
	const countUp = (value: number) => function CountUpChunk(chunks: ReactNode) {
		return <CountUp locale={locale} value={value}>{String(chunks)}</CountUp>
	}

	return (
		<section aria-labelledby="why-us-heading" className="bg-white px-gutter py-section text-tp-blue-muted" id="why-us">
			<div className="mx-auto max-w-content">
				<h2 className={SECTION_HEADING} id="why-us-heading">{t('title')}</h2>
				<p className="mx-auto mt-[clamp(1.5rem,1rem+2vw,3rem)] text-balance text-center font-serif text-[clamp(1.5rem,0.95rem+2.3vw,2.6875rem)] font-black uppercase italic leading-[1.15] text-tp-blue">
					<span className="sr-only">{t.markup('figures', { ...figureValues, languages: (chunks) => chunks, countries: (chunks) => chunks, continents: (chunks) => chunks })}</span>
					<span aria-hidden="true">
						{t.rich('figures', { ...figureValues, languages: countUp(FIGURES.languages), countries: countUp(FIGURES.countries), continents: countUp(FIGURES.continents) })}
					</span>
				</p>
				<div className="mx-auto mt-[clamp(3rem,2rem+4vw,6rem)] grid max-w-[38rem] gap-[clamp(2rem,1.6rem+1.5vw,3rem)] lg:max-w-none lg:grid-cols-2 lg:gap-x-[clamp(3rem,1rem+4vw,5rem)]">
					{OVERVIEW.map((key) => (
						<div key={key}>
							<h3 className={TOPIC_HEADING}>{t(`overview.${key}.title`)}</h3>
							<p className={BODY}>{t(`overview.${key}.body`)}</p>
							{key === 'presence' ? <p className={BODY}>{t('overview.presence.offices')}</p> : null}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export async function ClientCodex({ locale }: { locale: AppLocale }) {
	const t = await getTranslations({ locale, namespace: 'WhyUs' })
	return (
		<section aria-labelledby="client-codex-heading" className="bg-tp-blue-muted px-gutter py-section text-on-brand" id="client-codex">
			<div className="mx-auto max-w-content">
				<h2 className={SECTION_HEADING} id="client-codex-heading">{t('codex.title')}</h2>
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
	)
}
