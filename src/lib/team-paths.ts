import { routing, type AppLocale } from '@/i18n/routing'

// Team routes keep the legacy `/who-we-are/<slug>` shape: printed business-card
// QR codes point at the English, unprefixed profile URLs.
export const TEAM_SEGMENT = 'who-we-are'

export function teamPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/${TEAM_SEGMENT}${slug ? `/${slug}` : ''}`
}
