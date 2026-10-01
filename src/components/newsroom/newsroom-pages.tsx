import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { type ReactNode, Suspense } from 'react'

import { LoadingMessage } from '@/components/loading/loading-message'
import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { isArticleKind } from '@/components/newsroom/article-kind'
import { ArticleRichText } from '@/components/newsroom/article-rich-text'
import { ArticleSummaryCard, articleSummaryGridClass } from '@/components/newsroom/article-summary-card'
import { ArticleAuthors, ArticleAuthorsSkeleton, articleBodyClass, ArticleCover, ArticleHeader, articleSectionHeadingClass, ArticleSources, ArticleTopics, NewsroomDetailSkeleton } from '@/components/newsroom/newsroom-article'
import { NewsroomCard, NewsroomCardSkeleton, newsroomGridClass, NewsroomLeadCard } from '@/components/newsroom/newsroom-card'
import { NewsroomActiveFilters, NewsroomToolbar, NewsroomToolbarSkeleton, type NewsroomToolbarLabels } from '@/components/newsroom/newsroom-toolbar'
import { PageHero } from '@/components/shell/page-hero'
import { Link } from '@/i18n/navigation'
import { type AppLocale, routing } from '@/i18n/routing'
import { getPublishedNewsroomDetail, getPublishedNewsroomListing, type NewsroomFilters } from '@/lib/public-newsroom'

const slugFilterKeys = ['kind', 'tag', 'service', 'sector', 'author'] as const
const SEARCH_MAX_LENGTH = 100
const PUBLICATIONS_HERO_PLACEHOLDER = 'hero-publications-papers'

export function newsroomPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/newsroom${slug ? `/${slug}` : ''}`
}

function newsroomListingLanguages() {
	return Object.fromEntries([...routing.locales.map((locale) => [locale, newsroomPath(locale)]), ['x-default', newsroomPath(routing.defaultLocale)]])
}

export function newsroomFiltersFromSearchParams(searchParams: Record<string, string | string[] | undefined>): NewsroomFilters {
	const filters: NewsroomFilters = Object.fromEntries(slugFilterKeys.flatMap((key) => {
		const value = searchParams[key]
		return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? [[key, value]] : []
	}))
	const { q, year } = searchParams
	if (typeof year === 'string' && /^\d{4}$/.test(year)) filters.year = year
	if (typeof q === 'string') {
		const query = q.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LENGTH)
		if (query) filters.q = query
	}
	return filters
}

export function newsroomPageFromSearchParams(searchParams: Record<string, string | string[] | undefined>) {
	const value = searchParams.page
	if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1
	return Math.min(Math.max(Number(value), 1), 10_000)
}

export async function generateNewsroomListingMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Newsroom' })
	const canonical = newsroomPath(locale)
	return { alternates: { canonical, languages: newsroomListingLanguages() }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

export async function generateNewsroomDetailMetadata(locale: AppLocale, slug: string): Promise<Metadata> {
	await connection()
	const detail = await getPublishedNewsroomDetail(locale, slug)
	if (!detail) return { robots: { follow: false, index: false } }
	const canonical = newsroomPath(locale, detail.slug)
	const languages = Object.fromEntries(detail.alternates.map((alternate) => [alternate.locale, newsroomPath(alternate.locale, alternate.slug)]))
	const english = detail.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = newsroomPath(routing.defaultLocale, english.slug)
	const title = detail.seoTitle || detail.title; const description = detail.seoDescription || detail.excerpt || undefined
	return { alternates: { canonical, languages }, description, openGraph: { description, title, url: canonical }, title }
}

function kindLabel(t: (key: string) => string, kind: string) {
	return isArticleKind(kind) ? t(`kinds.${kind}`) : null
}

type SearchParams = Record<string, string | string[] | undefined>

// Figma 5408:334 (desktop) and 5651:90 (mobile). The hero is static and renders
// at once; the filter bar, cards and pagination stream in. A new filter or page
// remounts the stream (inner Suspense key), so its skeleton shows while it loads.
export async function NewsroomListingPage({ locale, searchParams }: { locale: AppLocale; searchParams: Promise<SearchParams> }) {
	const [t, tShell] = await Promise.all([
		getTranslations({ locale, namespace: 'Newsroom' }),
		getTranslations({ locale, namespace: 'Shell.placeholder' }),
	])
	const skeleton = <LoadingRegion label={t('loadingListing')}><NewsroomListingSkeleton /></LoadingRegion>
	return (
		<main>
			<PageHero illustration={{ kind: 'placeholder', name: PUBLICATIONS_HERO_PLACEHOLDER, label: tShell('illustration', { name: PUBLICATIONS_HERO_PLACEHOLDER }), aspectRatio: '1440 / 480' }} title={t('title')}>
				<p>{t('introduction')}</p>
			</PageHero>
			<div className="mx-auto max-w-content px-gutter py-section">
				<Suspense fallback={skeleton}>
					<NewsroomListingQuery fallback={skeleton} locale={locale} searchParams={searchParams} />
				</Suspense>
			</div>
		</main>
	)
}

async function NewsroomListingQuery({ fallback, locale, searchParams }: { fallback: ReactNode; locale: AppLocale; searchParams: Promise<SearchParams> }) {
	const query = await searchParams
	const filters = newsroomFiltersFromSearchParams(query); const page = newsroomPageFromSearchParams(query)
	return <Suspense fallback={fallback} key={JSON.stringify([filters, page])}><NewsroomListingContent filters={filters} locale={locale} page={page} /></Suspense>
}

async function NewsroomListingContent({ filters, locale, page }: { filters: NewsroomFilters; locale: AppLocale; page: number }) {
	await connection()
	const [listing, t] = await Promise.all([getPublishedNewsroomListing(locale, page, filters), getTranslations({ locale, namespace: 'Newsroom' })])
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
	const kinds = Object.fromEntries(listing.filters.kinds.flatMap((kind) => { const label = kindLabel(t, kind); return label ? [[kind, label]] : [] }))
	const labels: NewsroomToolbarLabels = {
		activeFilters: t('activeFilters'), anyOption: t('anyOption'), anyYear: t('anyYear'), apply: t('applyFilters'), author: t('author'), calendar: t('calendar'), categories: t('categories'), clear: t('clearFilters'), kind: t('kind'), kinds,
		removeFilter: (label) => t('removeFilter', { label }), search: t('search'), searchChip: (query) => t('searchChip', { query }), searchPlaceholder: t('searchPlaceholder'), searchSubmit: t('searchSubmit'), sector: t('sector'), service: t('service'), tag: t('tag'), year: t('year'),
	}
	const heading = filters.kind ? kindLabel(t, filters.kind) ?? t('latest') : t('latest')
	const cardLabels = (kind: string) => ({ kind: kindLabel(t, kind), readMore: t('readMore') })
	const filtered = Object.keys(filters).length > 0
	return (
		<>
			<NewsroomToolbar action={newsroomPath(locale)} filters={filters} labels={labels} options={listing.filters} />
			<NewsroomActiveFilters filters={filters} labels={labels} locale={locale} options={listing.filters} />
			<section aria-labelledby="newsroom-results-heading" className="mt-[clamp(2.5rem,2rem+2vw,3.5rem)]">
				<h2 className={listingHeadingClass} id="newsroom-results-heading">{heading}</h2>
				<p aria-live="polite" className="mt-2 text-center font-label text-body text-brand">{t('results', { count: listing.total })}</p>
				{listing.featured || listing.articles.length ? (
					<div className="mt-[clamp(1.5rem,1.2rem+1vw,2.25rem)] space-y-[clamp(1.25rem,0.9rem+1.2vw,1.5rem)]">
						{listing.featured ? <NewsroomLeadCard article={listing.featured} dateFormat={dateFormat} labels={cardLabels(listing.featured.kind)} locale={locale} /> : null}
						{listing.articles.length ? (
							<ul className={newsroomGridClass}>
								{listing.articles.map((article, index) => (
									<li className="motion-safe:animate-tile-in" key={article.id} style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}>
										<NewsroomCard article={article} dateFormat={dateFormat} index={index} labels={cardLabels(article.kind)} locale={locale} />
									</li>
								))}
							</ul>
						) : null}
					</div>
				) : (
					<div className="mx-auto mt-8 max-w-2xl rounded-panel border border-dashed border-tp-mist bg-surface-soft px-6 py-12 text-center text-brand" role="status">
						<p className="font-display text-heading-3 font-bold">{t('emptyTitle')}</p>
						<p className="mt-3 font-label text-body-lg">{t(filtered ? 'emptyFilteredDescription' : 'emptyDescription')}</p>
						{filtered ? <p className="mt-6"><Link className="inline-block bg-tp-blue px-6 py-2.5 font-serif uppercase text-on-brand hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href="/newsroom" locale={locale}>{t('clearFilters')}</Link></p> : null}
					</div>
				)}
				{listing.pageCount > 1 ? <Pagination filters={filters} locale={locale} page={listing.page} pageCount={listing.pageCount} t={{ label: t('pagination'), next: t('next'), page: t('page', { page: listing.page, pageCount: listing.pageCount }), previous: t('previous') }} /> : null}
			</section>
		</>
	)
}

const listingHeadingClass = 'text-center font-serif text-heading-2 font-bold uppercase text-tp-blue-muted'
const pageButtonClass = 'inline-block bg-tp-blue px-[clamp(1.25rem,1rem+1vw,1.75rem)] py-3 font-serif text-lead uppercase text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none'

// Figma shows a single "LOAD MORE" button; the listing keeps crawlable,
// shareable URL pages instead, in the same button style.
function Pagination({ filters, locale, page, pageCount, t }: { filters: NewsroomFilters; locale: AppLocale; page: number; pageCount: number; t: { label: string; next: string; page: string; previous: string } }) {
	const href = (target: number) => ({ pathname: '/newsroom' as const, query: { ...filters, page: String(target) } })
	return (
		<nav aria-label={t.label} className="mt-[clamp(2.5rem,2rem+2vw,3.5rem)] flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
			{page > 1 ? <Link className={pageButtonClass} href={href(page - 1)} locale={locale} rel="prev">{t.previous}</Link> : null}
			<p aria-current="page" className="font-serif text-body-lg text-brand">{t.page}</p>
			{page < pageCount ? <Link className={pageButtonClass} href={href(page + 1)} locale={locale} rel="next">{t.next}</Link> : null}
		</nav>
	)
}

// Filter bar, heading, count and four cards (two on mobile) while the listing loads.
function NewsroomListingSkeleton() {
	return (
		<>
			<NewsroomToolbarSkeleton />
			<div className="mt-[clamp(2.5rem,2rem+2vw,3.5rem)]">
				<SkeletonText className={`${listingHeadingClass} mx-auto w-64`} lastLineWidth="w-full" />
				<SkeletonText className="mx-auto mt-2 w-24 font-label text-body" lastLineWidth="w-full" />
				<ul className={`mt-[clamp(1.5rem,1.2rem+1vw,2.25rem)] ${newsroomGridClass}`}>
					{Array.from({ length: 4 }, (_, index) => <li className={index > 1 ? 'max-md:hidden' : undefined} key={index}><NewsroomCardSkeleton index={index} /></li>)}
				</ul>
			</div>
		</>
	)
}

// One template for every kind (Figma 5534:989 newsletter/article, 5542:2
// video/podcast). Every section after the body renders only when it has content.
export function NewsroomDetailPage({ locale, slug }: { locale: AppLocale; slug: string }) {
	return <Suspense fallback={<NewsroomDetailSkeleton label={<LoadingMessage messageKey="Newsroom.loadingArticle" />} />}><NewsroomDetailContent locale={locale} slug={slug} /></Suspense>
}

async function NewsroomDetailContent({ locale, slug }: { locale: AppLocale; slug: string }) {
	await connection()
	const [article, t] = await Promise.all([getPublishedNewsroomDetail(locale, slug), getTranslations({ locale, namespace: 'Newsroom' })])
	if (!article) notFound()
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
	return (
		<main>
			<article>
				<ArticleHeader article={article} bylineTemplate={t.raw('byline') as string} dateFormat={dateFormat} kindLabel={kindLabel(t, article.kind)} locale={locale} />
				<ArticleCover article={article} externalMediaLabel={t('externalMedia')} />
				<div className={articleBodyClass}>
					<ArticleRichText content={article.content} media={article.inlineMedia} />
					<ArticleTopics
						groups={[{ items: article.tags, key: 'tag', label: t('tags') }, { items: article.services, key: 'service', label: t('services') }, { items: article.sectors, key: 'sector', label: t('sectors') }]}
						heading={t('relatedTopics')}
						locale={locale}
					/>
					<ArticleSources heading={t('sources')} sources={article.sources} />
					<Suspense fallback={<ArticleAuthorsSkeleton label={t('loadingAuthors')} />}>
						<ArticleAuthors authors={article.authors} labels={{ email: t('email'), heading: (count) => t('moreAboutAuthors', { count }), phone: t('phone') }} locale={locale} />
					</Suspense>
					{article.relatedArticles.length ? (
						<section aria-labelledby="article-related-heading">
							<h2 className={articleSectionHeadingClass} id="article-related-heading">{t('relatedArticles')}</h2>
							<ul className={articleSummaryGridClass}>
								{article.relatedArticles.map((related) => (
									<li key={related.id}>
										<ArticleSummaryCard article={related} byline={related.authors.length ? t('byline', { authors: related.authors.map((author) => author.name).join(', ') }) : null} dateFormat={dateFormat} locale={locale} />
									</li>
								))}
							</ul>
						</section>
					) : null}
				</div>
			</article>
		</main>
	)
}
