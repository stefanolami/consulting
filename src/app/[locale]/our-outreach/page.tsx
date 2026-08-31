import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateOutreachListingMetadata, OutreachOverviewPage } from '@/components/outreach/outreach-pages'
import { routing } from '@/i18n/routing'

type OutreachPageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: OutreachPageProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateOutreachListingMetadata(locale)
}

export default async function OutreachPage({ params }: OutreachPageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <OutreachOverviewPage locale={locale} />
}
