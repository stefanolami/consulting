import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateNewsroomListingMetadata, NewsroomListingPage } from '@/components/newsroom/newsroom-pages'
import { routing } from '@/i18n/routing'

type NewsroomPageProps = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: NewsroomPageProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateNewsroomListingMetadata(locale)
}

// The search parameters are read inside the listing's Suspense boundary, so
// the hero renders without waiting for them.
export default async function NewsroomPage({ params, searchParams }: NewsroomPageProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <NewsroomListingPage locale={locale} searchParams={searchParams} />
}
