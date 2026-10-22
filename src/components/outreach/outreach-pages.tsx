import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'

import { type AppLocale, routing } from '@/i18n/routing'
import { getPublishedOutreachDetail } from '@/lib/public-outreach'

export function outreachPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/our-outreach${slug ? `/${slug}` : ''}`
}

function listingLanguages() {
	return Object.fromEntries([...routing.locales.map((locale) => [locale, outreachPath(locale)]), ['x-default', outreachPath(routing.defaultLocale)]])
}

export async function generateOutreachListingMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Outreach' })
	const canonical = outreachPath(locale)
	return { alternates: { canonical, languages: listingLanguages() }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

export async function generateOutreachDetailMetadata(locale: AppLocale, slug: string): Promise<Metadata> {
	await connection()
	const country = await getPublishedOutreachDetail(locale, slug)
	if (!country) return { robots: { follow: false, index: false } }
	const canonical = outreachPath(locale, country.slug)
	const languages = Object.fromEntries(country.alternates.map((alternate) => [alternate.locale, outreachPath(alternate.locale, alternate.slug)]))
	const english = country.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = outreachPath(routing.defaultLocale, english.slug)
	const title = country.seoTitle || country.name
	const description = country.seoDescription || country.summary || undefined
	return { alternates: { canonical, languages }, description, openGraph: { description, title, url: canonical }, title }
}
