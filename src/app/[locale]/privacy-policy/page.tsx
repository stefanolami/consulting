import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { generateLegalMetadata, LegalPage } from '@/components/legal/legal-page'
import { routing } from '@/i18n/routing'

type PrivacyPolicyRouteProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PrivacyPolicyRouteProps): Promise<Metadata> {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) return {}
	return generateLegalMetadata('privacy-policy', locale)
}

export default async function PrivacyPolicyRoute({ params }: PrivacyPolicyRouteProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) notFound()
	setRequestLocale(locale)
	return <LegalPage legalKey="privacy-policy" locale={locale} />
}
