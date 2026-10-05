import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Partners } from '@/components/partners/partners-section'
import { PageHero } from '@/components/shell/page-hero'
import { routing, type AppLocale } from '@/i18n/routing'

// The Time&Place Group site (legacy home-page.jsx); opens in a new tab.
const GROUP_URL = 'https://www.groupontap.com/en'

export function homePath(locale: AppLocale) {
	return locale === routing.defaultLocale ? '/' : `/${locale}`
}

export async function generateHomeMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'HomePage' })
	const canonical = homePath(locale)
	const languages = Object.fromEntries([...routing.locales.map((entry) => [entry, homePath(entry)]), ['x-default', homePath(routing.defaultLocale)]])
	// `absolute`: the title already names the company, so the layout template
	// ("%s | Time&Place Consulting") is not applied.
	return { alternates: { canonical, languages }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('metaTitle'), url: canonical }, title: { absolute: t('metaTitle') } }
}

const LABEL = 'font-serif text-lead font-medium uppercase'
const BODY = 'font-serif text-lead font-medium text-pretty text-left md:text-center'

// Figma 5408:616 (desktop) and 5651:631 (mobile); structure from the legacy
// home-page.jsx. The Figma newsroom "news scroll" is deferred (control tower
// §15.9) and has no slot here.
export async function HomePage({ locale }: { locale: AppLocale }) {
	const [t, tShell] = await Promise.all([
		getTranslations({ locale, namespace: 'HomePage' }),
		getTranslations({ locale, namespace: 'Shell' }),
	])
	const groupLink = (chunks: ReactNode) => (
		<a
			className="font-semibold italic underline decoration-1 underline-offset-[0.2em] hover:decoration-2 focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
			href={GROUP_URL}
			rel="noopener noreferrer"
			target="_blank"
		>
			{chunks}
			<ExternalLink aria-hidden="true" className="ml-1 inline-block size-[0.8em] align-baseline" />
			<span className="sr-only"> ({tShell('nav.externalHint')})</span>
		</a>
	)

	return (
		<main>
			{/* PLACEHOLDER illustration: the Figma homepage doors line drawing is not in the repository (docs/figma-asset-needs.md). */}
			<PageHero
				illustration={{ kind: 'placeholder', name: 'hero-homepage-doors', label: tShell('placeholder.illustration', { name: 'hero-homepage-doors' }), aspectRatio: '1440 / 497' }}
				title={<><span className="block text-[clamp(2rem,1.3rem+2.8vw,3.875rem)] leading-tight">{t('heroLead')}</span><span className="block text-[clamp(2.75rem,1.7rem+4.2vw,5.3125rem)] uppercase leading-none">{t('heroEmphasis')}</span></>}
				titleVariant="display"
			/>
			<section aria-labelledby="home-intro-heading" className="bg-surface-tint px-gutter py-section text-black">
				<div className="mx-auto flex max-w-[52rem] flex-col items-center gap-[clamp(1.25rem,0.9rem+1.4vw,2.25rem)]">
					<div className="flex flex-col items-center gap-[clamp(0.75rem,0.5rem+1vw,1.5rem)] text-center">
						<h2 className="font-serif text-heading-1 font-semibold uppercase text-brand" id="home-intro-heading">{t('intro.title')}</h2>
						<p className={LABEL}>{t.rich('intro.pillar', { group: groupLink })}</p>
					</div>
					<span aria-hidden="true" className="block h-[3px] w-[clamp(8rem,6.5rem+6vw,12.375rem)] bg-tp-blue" />
					<p className={`${LABEL} text-center`}>{t('intro.snapshot')}</p>
					<div className="space-y-[1.5em]">
						<p className={BODY}>{t.rich('intro.lead', { strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}</p>
						<p className={BODY}>{t('intro.body')}</p>
					</div>
				</div>
			</section>
			<Partners locale={locale} />
		</main>
	)
}
