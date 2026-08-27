import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateNewsroomListingMetadata, NewsroomListingPage, newsroomFiltersFromSearchParams, newsroomPageFromSearchParams } from '@/components/newsroom/newsroom-pages'
import { routing } from '@/i18n/routing'

type NewsroomPageProps = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: NewsroomPageProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateNewsroomListingMetadata(locale)
}

export default async function NewsroomPage({ params, searchParams }: NewsroomPageProps) {
	const [{ locale }, query] = await Promise.all([params, searchParams])
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <NewsroomListingPage filters={newsroomFiltersFromSearchParams(query)} locale={locale} page={newsroomPageFromSearchParams(query)} />
}
