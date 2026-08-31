import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateOutreachDetailMetadata, OutreachDetailPage } from '@/components/outreach/outreach-pages'
import { routing } from '@/i18n/routing'

type OutreachDetailPageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: OutreachDetailPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateOutreachDetailMetadata(locale, slug)
}

export default async function OutreachCountryPage({ params }: OutreachDetailPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <OutreachDetailPage locale={locale} slug={slug} />
}
