import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ContactPage, generateContactMetadata } from '@/components/contact/contact-page'
import { routing } from '@/i18n/routing'

type ContactRouteProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: ContactRouteProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateContactMetadata(locale)
}

export default async function ContactRoute({ params }: ContactRouteProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <ContactPage locale={locale} />
}
