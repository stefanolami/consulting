import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
	CatalogueDetailPage,
	generateCatalogueDetailMetadata,
} from '@/components/catalogue/catalogue-pages'
import { routing } from '@/i18n/routing'

type ServiceDetailPageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateCatalogueDetailMetadata('service', locale, slug)
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <CatalogueDetailPage kind="service" locale={locale} slug={slug} />
}
