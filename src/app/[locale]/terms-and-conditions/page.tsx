import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateLegalMetadata, LegalPage } from '@/components/legal/legal-page'
import { routing } from '@/i18n/routing'

type TermsAndConditionsRouteProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: TermsAndConditionsRouteProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateLegalMetadata('terms-and-conditions', locale)
}

export default async function TermsAndConditionsRoute({ params }: TermsAndConditionsRouteProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <LegalPage legalKey="terms-and-conditions" locale={locale} />
}
