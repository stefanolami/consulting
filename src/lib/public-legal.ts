import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { routing, type AppLocale } from '@/i18n/routing'
import { PUBLIC_LEGAL_CACHE_TAG } from '@/lib/cache-tags'
import { parseLegalDocument, type LegalDocument } from '@/lib/legal-document.mjs'
import type { LegalPageKey } from '@/lib/legal-pages'
import { createPublicClient } from '@/lib/supabase/public'

export type PublishedLegalTranslation = {
	content: LegalDocument
	/** `YYYY-MM-DD`, the editor-set "last updated" date. */
	lastUpdatedOn: string
	locale: AppLocale
	seoDescription: string | null
	seoTitle: string | null
	title: string
}

/**
 * What a legal route renders in one locale (platform doc §11.5):
 * - `published`: the exact-locale translation;
 * - `english-only`: this locale has none, English does, so the route shows the
 *   localized notice linking to English;
 * - `missing`: English is not published either, so the route is not found.
 * `publishedLocales` lists every locale with a public translation, for
 * hreflang alternates.
 */
export type LegalPageResult =
	| { kind: 'published'; page: PublishedLegalTranslation; publishedLocales: AppLocale[] }
	| { kind: 'english-only'; english: PublishedLegalTranslation; publishedLocales: AppLocale[] }
	| { kind: 'missing' }

const CACHE_REVALIDATE_SECONDS = 60 * 60

// Every published translation of one page, read anonymously so the public RLS
// contract applies: the page is active, and each translation is published
// with a publication time that has passed. Nothing falls back to English.
async function loadPublishedLegalTranslations(key: LegalPageKey): Promise<PublishedLegalTranslation[]> {
	const supabase = createPublicClient()
	const now = new Date().toISOString()
	const { data: page, error: pageError } = await supabase.from('legal_pages').select('id').eq('stable_key', key).eq('is_active', true).maybeSingle()
	if (pageError) throw new Error(`Unable to load the ${key} page: ${pageError.message}`)
	if (!page) return []
	const { data: translations, error } = await supabase
		.from('legal_page_translations')
		.select('locale, title, content, last_updated_on, seo_title, seo_description')
		.eq('legal_page_id', page.id)
		.eq('status', 'published')
		.lte('published_at', now)
	if (error) throw new Error(`Unable to load the ${key} translations: ${error.message}`)
	return (translations ?? []).flatMap((translation) => {
		const locale = routing.locales.find((entry) => entry === translation.locale)
		if (!locale || !translation.last_updated_on) return []
		try {
			return [{
				content: parseLegalDocument(translation.content),
				lastUpdatedOn: translation.last_updated_on,
				locale,
				seoDescription: translation.seo_description?.trim() || null,
				seoTitle: translation.seo_title?.trim() || null,
				title: translation.title.trim(),
			}]
		} catch (error) {
			// The admin validates every save, so this means stored content was
			// changed outside it. The locale is treated as unpublished.
			console.error(`Invalid legal document for ${key} (${locale}): ${error instanceof Error ? error.message : 'unknown error'}`)
			return []
		}
	})
}

const getPublishedLegalTranslations = unstable_cache(
	loadPublishedLegalTranslations,
	['published-legal-translations'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_LEGAL_CACHE_TAG] },
)

// React cache() shares one read between generateMetadata and the page.
export const getPublishedLegalPage = cache(async (key: LegalPageKey, locale: AppLocale): Promise<LegalPageResult> => {
	const translations = await getPublishedLegalTranslations(key)
	const publishedLocales = routing.locales.filter((entry) => translations.some((translation) => translation.locale === entry))
	const english = translations.find((translation) => translation.locale === routing.defaultLocale) ?? null
	const page = translations.find((translation) => translation.locale === locale)
	if (page) return { kind: 'published', page, publishedLocales }
	if (english) return { kind: 'english-only', english, publishedLocales }
	return { kind: 'missing' }
})
