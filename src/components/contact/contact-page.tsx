import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { HERO_ART } from '@/components/shell/hero-art'
import { PageHero } from '@/components/shell/page-hero'
import { routing, type AppLocale } from '@/i18n/routing'

import { ContactForm } from './contact-form'
import { HeadOffice } from './head-office'
import { OfficeNetwork } from './office-network'

export function contactPath(locale: AppLocale) {
	return locale === routing.defaultLocale ? '/contact' : `/${locale}/contact`
}

export async function generateContactMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Contact' })
	const canonical = contactPath(locale)
	const languages = Object.fromEntries([...routing.locales.map((entry) => [entry, contactPath(entry)]), ['x-default', contactPath(routing.defaultLocale)]])
	return { alternates: { canonical, languages }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

// Figma 5408:348 (desktop) and 5651:504 (mobile); structure from the legacy
// contact page. The hero is static; the office network and the head office
// stream from the CMS. The form is static; its anti-spam token is a cookie set
// by the proxy (src/proxy.ts), so it works without JavaScript (control tower
// §15.10).
export async function ContactPage({ locale }: { locale: AppLocale }) {
	const t = await getTranslations({ locale, namespace: 'Contact' })

	return (
		<main>
			<PageHero
				illustration={HERO_ART.contact}
				title={t('title')}
			/>
			<OfficeNetwork locale={locale} />
			<section aria-labelledby="contact-form-heading" className="bg-tp-blue-muted px-gutter py-section text-on-brand">
				<div className="mx-auto grid max-w-shell gap-[clamp(3rem,2rem+4vw,6rem)] lg:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)] lg:items-start">
					<div>
						<h2 className="font-serif text-heading-2 font-bold uppercase" id="contact-form-heading">{t('form.title')}</h2>
						<ContactForm locale={locale} />
					</div>
					<HeadOffice locale={locale} />
				</div>
			</section>
		</main>
	)
}
