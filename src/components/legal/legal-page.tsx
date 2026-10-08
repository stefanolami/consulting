import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { LoadingMessage } from '@/components/loading/loading-message'
import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { PageHero, PageHeroSkeleton } from '@/components/shell/page-hero'
import { Link } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { LEGAL_PAGE_LABEL_KEYS, legalPath, type LegalPageKey } from '@/lib/legal-pages'
import { getPublishedLegalPage } from '@/lib/public-legal'

import { LegalRichText } from './legal-rich-text'

// One template for the three legal pages (platform doc §11). There is no
// Figma frame: the navy PageHero without artwork, then the document at a prose
// measure on white, in the site's type scale.
const ARTICLE_WRAPPER = 'mx-auto max-w-content px-gutter py-section text-tp-navy'
const ARTICLE_MEASURE = 'mx-auto max-w-prose'
const UPDATED_CLASS = 'font-label text-body font-medium italic text-tp-blue-muted'
const HEADING_SKELETON = 'pt-6 font-display text-heading-3 font-bold'
const BODY_SKELETON = 'font-label text-body-lg'

function alternateLanguages(key: LegalPageKey, publishedLocales: AppLocale[]) {
	const languages: Record<string, string> = Object.fromEntries(publishedLocales.map((locale) => [locale, legalPath(key, locale)]))
	if (publishedLocales.includes(routing.defaultLocale)) languages['x-default'] = legalPath(key, routing.defaultLocale)
	return languages
}

export async function generateLegalMetadata(key: LegalPageKey, locale: AppLocale): Promise<Metadata> {
	await connection()
	const result = await getPublishedLegalPage(key, locale)
	if (result.kind === 'missing') return { robots: { follow: false, index: false } }
	const languages = alternateLanguages(key, result.publishedLocales)
	if (result.kind === 'english-only') {
		// The notice is not the page: it is kept out of the index and points
		// search engines at the English text.
		const t = await getTranslations({ locale, namespace: 'Shell.footer' })
		return {
			alternates: { canonical: legalPath(key, routing.defaultLocale), languages },
			robots: { follow: true, index: false },
			title: t(LEGAL_PAGE_LABEL_KEYS[key]),
		}
	}
	const canonical = legalPath(key, locale)
	const title = result.page.seoTitle || result.page.title
	const description = result.page.seoDescription || undefined
	return {
		alternates: { canonical, languages },
		description,
		openGraph: { description, title, url: canonical },
		title,
	}
}

export function LegalPage({ legalKey, locale }: { legalKey: LegalPageKey; locale: AppLocale }) {
	return (
		<Suspense fallback={<LegalPageSkeleton />}>
			<LegalPageContent legalKey={legalKey} locale={locale} />
		</Suspense>
	)
}

async function LegalPageContent({ legalKey, locale }: { legalKey: LegalPageKey; locale: AppLocale }) {
	await connection()
	const [result, t] = await Promise.all([getPublishedLegalPage(legalKey, locale), getTranslations({ locale, namespace: 'Legal' })])
	if (result.kind === 'missing') notFound()
	if (result.kind === 'english-only') return <LegalNotice english={result.english} legalKey={legalKey} locale={locale} />
	const { page } = result
	return (
		<main>
			<article aria-labelledby="legal-title">
				<PageHero title={<span id="legal-title">{page.title}</span>} />
				<div className={ARTICLE_WRAPPER}>
					<div className={ARTICLE_MEASURE}>
						<p className={UPDATED_CLASS}>
							{t.rich('lastUpdated', { date: formatLegalDate(page.lastUpdatedOn, locale), time: (chunks) => <time dateTime={page.lastUpdatedOn}>{chunks}</time> })}
						</p>
						<LegalRichText className="mt-[clamp(1.5rem,1.2rem+1vw,2.5rem)]" document={page.content} locale={locale} />
					</div>
				</div>
			</article>
		</main>
	)
}

// Shown when this locale has no published translation but English does
// (platform doc §11.5): interface text only, never the English body.
async function LegalNotice({ english, legalKey, locale }: { english: { title: string }; legalKey: LegalPageKey; locale: AppLocale }) {
	const [t, tFooter] = await Promise.all([getTranslations({ locale, namespace: 'Legal' }), getTranslations({ locale, namespace: 'Shell.footer' })])
	return (
		<main>
			<PageHero title={tFooter(LEGAL_PAGE_LABEL_KEYS[legalKey])} />
			<div className={ARTICLE_WRAPPER}>
				<div className={`${ARTICLE_MEASURE} space-y-4 font-label text-body-lg`}>
					<p>{t('notice.unavailable')}</p>
					<p>
						{t.rich('notice.readInEnglish', {
							link: () => (
								<Link
									className="rounded-control font-bold text-tp-blue underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
									href={`/${legalKey}`}
									hrefLang="en"
									locale={routing.defaultLocale}
								>
									<span lang="en">{english.title}</span>
								</Link>
							),
						})}
					</p>
				</div>
			</div>
		</main>
	)
}

function formatLegalDate(value: string, locale: AppLocale) {
	// A calendar date with no time of day: format it in UTC so no time zone
	// moves it to the previous day.
	return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

// The finished template's shape: hero title, the "last updated" line, then
// section headings and paragraphs at the prose measure, in the same type.
export function LegalPageSkeleton() {
	return (
		<LoadingRegion as="main" label={<LoadingMessage messageKey="Legal.loading" />}>
			<PageHeroSkeleton illustration="none" introLines={0} />
			<div className={ARTICLE_WRAPPER}>
				<div className={ARTICLE_MEASURE}>
					<SkeletonText className={UPDATED_CLASS} lastLineWidth="w-1/3" />
					<div className="mt-[clamp(1.5rem,1.2rem+1vw,2.5rem)] space-y-5">
						<SkeletonText className={BODY_SKELETON} lastLineWidth="w-2/3" lines={4} />
						{[3, 5].map((lines) => (
							<div className="space-y-5" key={lines}>
								<SkeletonText className={HEADING_SKELETON} lastLineWidth="w-1/2" />
								<SkeletonText className={BODY_SKELETON} lastLineWidth="w-3/5" lines={lines} />
							</div>
						))}
					</div>
				</div>
			</div>
		</LoadingRegion>
	)
}
