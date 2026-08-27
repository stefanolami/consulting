import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
	CatalogueListingPage,
	generateCatalogueListingMetadata,
} from '@/components/catalogue/catalogue-pages'
import { routing } from '@/i18n/routing'

type ServicesPageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: ServicesPageProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateCatalogueListingMetadata('service', locale)
}

export default async function ServicesPage({ params }: ServicesPageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <CatalogueListingPage kind="service" locale={locale} />
}
