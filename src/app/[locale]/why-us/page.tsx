import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateWhyUsMetadata, WhyUsPage } from '@/components/why-us/why-us-page'
import { routing } from '@/i18n/routing'

type WhyUsRouteProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: WhyUsRouteProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateWhyUsMetadata(locale)
}

export default async function WhyUsRoute({ params }: WhyUsRouteProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <WhyUsPage locale={locale} />
}
