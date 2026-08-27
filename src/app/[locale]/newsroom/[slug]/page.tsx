import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateNewsroomDetailMetadata, NewsroomDetailPage } from '@/components/newsroom/newsroom-pages'
import { routing } from '@/i18n/routing'

type NewsroomDetailPageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: NewsroomDetailPageProps): Promise<Metadata> {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateNewsroomDetailMetadata(locale, slug)
}

export default async function NewsroomDetailPageRoute({ params }: NewsroomDetailPageProps) {
	const { locale, slug } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <NewsroomDetailPage locale={locale} slug={slug} />
}
