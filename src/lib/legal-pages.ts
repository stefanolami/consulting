import { routing, type AppLocale } from '@/i18n/routing'

// The fixed legal pages (platform doc §11.2). The keys are the database
// `stable_key` values and the legacy public paths; adding a page needs a
// migration, a route and a footer entry.
export const LEGAL_PAGE_KEYS = ['privacy-policy', 'terms-and-conditions', 'cookie-use'] as const

export type LegalPageKey = (typeof LEGAL_PAGE_KEYS)[number]

/** The `Shell.footer.*` message that names each page in the interface. */
export const LEGAL_PAGE_LABEL_KEYS = {
	'cookie-use': 'cookieUse',
	'privacy-policy': 'privacyPolicy',
	'terms-and-conditions': 'termsAndConditions',
} as const satisfies Record<LegalPageKey, string>

export function isLegalPageKey(value: string): value is LegalPageKey {
	return (LEGAL_PAGE_KEYS as readonly string[]).includes(value)
}

/** Public path of a legal page; English is unprefixed (`/de/cookie-use`). */
export function legalPath(key: LegalPageKey, locale: AppLocale) {
	return locale === routing.defaultLocale ? `/${key}` : `/${locale}/${key}`
}
