import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { CatalogueRichText } from '@/components/catalogue/catalogue-rich-text'
import { type AppLocale, routing } from '@/i18n/routing'
import { getPublishedNewsroomDetail, getPublishedNewsroomListing, type NewsroomArticleCard, type NewsroomFilters } from '@/lib/public-newsroom'

const filterKeys = ['tag', 'service', 'sector', 'author'] as const

export function newsroomPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/newsroom${slug ? `/${slug}` : ''}`
}

function newsroomListingLanguages() {
	return Object.fromEntries([...routing.locales.map((locale) => [locale, newsroomPath(locale)]), ['x-default', newsroomPath(routing.defaultLocale)]])
}

export function newsroomFiltersFromSearchParams(searchParams: Record<string, string | string[] | undefined>): NewsroomFilters {
	return Object.fromEntries(filterKeys.flatMap((key) => {
		const value = searchParams[key]
		return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? [[key, value]] : []
	}))
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

export function NewsroomListingPage({ filters, locale, page }: { filters: NewsroomFilters; locale: AppLocale; page: number }) {
	return <Suspense fallback={<NewsroomLoading />}><NewsroomListingContent filters={filters} locale={locale} page={page} /></Suspense>
}

async function NewsroomListingContent({ filters, locale, page }: { filters: NewsroomFilters; locale: AppLocale; page: number }) {
	await connection()
	const [listing, t] = await Promise.all([getPublishedNewsroomListing(locale, page, filters), getTranslations({ locale, namespace: 'Newsroom' })])
	return <main className="min-h-screen bg-white px-6 py-12 text-slate-900 sm:px-10 sm:py-16 lg:px-16"><div className="mx-auto max-w-6xl"><header className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{t('eyebrow')}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1><p className="mt-5 text-lg leading-8 text-slate-700">{t('introduction')}</p></header><NewsroomFiltersForm filters={filters} locale={locale} options={listing.filters} t={{ apply: t('applyFilters'), author: t('author'), clear: t('clearFilters'), sector: t('sector'), service: t('service'), tag: t('tag') }} /><p aria-live="polite" className="mt-8 text-sm text-slate-600">{t('results', { count: listing.total })}</p>{listing.articles.length ? <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listing.articles.map((article) => <li key={article.id}><ArticleCard article={article} locale={locale} /></li>)}</ul> : <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8" role="status"><h2 className="text-xl font-semibold">{t('emptyTitle')}</h2><p className="mt-2 text-slate-700">{t(Object.keys(filters).length ? 'emptyFilteredDescription' : 'emptyDescription')}</p></div>}{listing.pageCount > 1 ? <Pagination filters={filters} locale={locale} page={listing.page} pageCount={listing.pageCount} t={{ next: t('next'), page: t('page', { page: listing.page, pageCount: listing.pageCount }), previous: t('previous') }} /> : null}</div></main>
}

function NewsroomFiltersForm({ filters, locale, options, t }: { filters: NewsroomFilters; locale: AppLocale; options: Awaited<ReturnType<typeof getPublishedNewsroomListing>>['filters']; t: { apply: string; author: string; clear: string; sector: string; service: string; tag: string } }) {
	return <form action={newsroomPath(locale)} className="mt-10 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect defaultValue={filters.tag} label={t.tag} name="tag" options={options.tags} /><FilterSelect defaultValue={filters.service} label={t.service} name="service" options={options.services} /><FilterSelect defaultValue={filters.sector} label={t.sector} name="sector" options={options.sectors} /><FilterSelect defaultValue={filters.author} label={t.author} name="author" options={options.authors} /><div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4"><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">{t.apply}</button><Link className="rounded-md px-4 py-2 text-sm font-medium underline underline-offset-4" href={newsroomPath(locale)}>{t.clear}</Link></div></form>
}

function FilterSelect({ defaultValue, label, name, options }: { defaultValue?: string; label: string; name: string; options: Array<{ label: string; slug: string }> }) {
	return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><select className="h-10 rounded-md border border-slate-300 bg-white px-3" defaultValue={defaultValue ?? ''} name={name}><option value="">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option.slug} value={option.slug}>{option.label}</option>)}</select></label>
}

function ArticleCard({ article, locale }: { article: NewsroomArticleCard; locale: AppLocale }) {
	return <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"><Link aria-label={article.title} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950" href={newsroomPath(locale, article.slug)}>{article.cover ? <Image alt={article.cover.alt} className="aspect-[16/9] w-full object-cover" height={360} src={article.cover.url} width={640} /> : <div aria-hidden="true" className="aspect-[16/9] bg-slate-100" />}</Link><div className="flex flex-1 flex-col p-5"><time className="text-sm text-slate-600" dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time><h2 className="mt-3 text-2xl font-semibold leading-tight"><Link className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href={newsroomPath(locale, article.slug)}>{article.title}</Link></h2>{article.excerpt ? <p className="mt-3 leading-7 text-slate-700">{article.excerpt}</p> : null}{article.authors.length ? <p className="mt-4 text-sm text-slate-600">{article.authors.map((author, index) => <span key={author.id}>{index ? ', ' : null}{author.profileSlug ? <Link className="underline underline-offset-2" href={teamPath(locale, author.profileSlug)}>{author.name}</Link> : author.name}</span>)}</p> : null}{article.tags.length ? <ul className="mt-4 flex flex-wrap gap-2">{article.tags.map((tag) => <li className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700" key={tag.slug}>{tag.label}</li>)}</ul> : null}</div></article>
}

function Pagination({ filters, locale, page, pageCount, t }: { filters: NewsroomFilters; locale: AppLocale; page: number; pageCount: number; t: { next: string; page: string; previous: string } }) {
	return <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4"><span className="text-sm text-slate-600">{t.page}</span>{page > 1 ? <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" href={listingHref(locale, filters, page - 1)}>{t.previous}</Link> : <span />}{page < pageCount ? <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" href={listingHref(locale, filters, page + 1)}>{t.next}</Link> : <span />}</nav>
}

export function NewsroomDetailPage({ locale, slug }: { locale: AppLocale; slug: string }) {
	return <Suspense fallback={<NewsroomLoading />}><NewsroomDetailContent locale={locale} slug={slug} /></Suspense>
}

async function NewsroomDetailContent({ locale, slug }: { locale: AppLocale; slug: string }) {
	await connection()
	const [article, t] = await Promise.all([getPublishedNewsroomDetail(locale, slug), getTranslations({ locale, namespace: 'Newsroom' })])
	if (!article) notFound()
	return <main className="min-h-screen bg-white px-6 py-12 text-slate-900 sm:px-10 sm:py-16 lg:px-16"><article className="mx-auto max-w-4xl"><Link className="text-sm font-medium underline underline-offset-4" href={newsroomPath(locale)}>← {t('title')}</Link><header className="mt-10"><time className="text-sm text-slate-600" dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{article.title}</h1>{article.excerpt ? <p className="mt-6 text-xl leading-8 text-slate-700">{article.excerpt}</p> : null}{article.authors.length ? <p className="mt-6 text-sm text-slate-700">{t('byline')}: {article.authors.map((author, index) => <span key={author.id}>{index ? ', ' : null}{author.profileSlug ? <Link className="underline underline-offset-2" href={teamPath(locale, author.profileSlug)}>{author.name}</Link> : author.name}</span>)}</p> : null}{article.tags.length ? <TaxonomyList items={article.tags} label={t('tags')} /> : null}{article.cover ? <figure className="mt-8"><Image alt={article.cover.alt} className="w-full rounded-lg object-cover" height={720} priority src={article.cover.url} width={1280} />{article.cover.caption ? <figcaption className="mt-2 text-sm text-slate-600">{article.cover.caption}</figcaption> : null}</figure> : article.externalMediaUrl ? <p className="mt-8 text-sm"><a className="underline underline-offset-4" href={article.externalMediaUrl} rel="noreferrer" target="_blank">{t('externalMedia')}</a></p> : null}</header><div className="mt-10"><CatalogueRichText content={article.content} /></div>{article.services.length || article.sectors.length ? <section className="mt-12 border-t border-slate-200 pt-8"><h2 className="text-2xl font-semibold">{t('relatedTopics')}</h2>{article.services.length ? <TaxonomyList items={article.services} label={t('services')} /> : null}{article.sectors.length ? <TaxonomyList items={article.sectors} label={t('sectors')} /> : null}</section> : null}{article.sources.length ? <section className="mt-12 border-t border-slate-200 pt-8"><h2 className="text-2xl font-semibold">{t('sources')}</h2><ol className="mt-4 list-decimal space-y-2 pl-5">{article.sources.map((source) => <li key={`${source.label}-${source.url}`}><a className="underline underline-offset-4" href={source.url} rel="noreferrer" target="_blank">{source.label}</a></li>)}</ol></section> : null}{article.relatedArticles.length ? <section className="mt-12 border-t border-slate-200 pt-8"><h2 className="text-2xl font-semibold">{t('relatedArticles')}</h2><ul className="mt-5 grid gap-5 sm:grid-cols-2">{article.relatedArticles.map((related) => <li key={related.id}><ArticleCard article={related} locale={locale} /></li>)}</ul></section> : null}</article></main>
}

function TaxonomyList({ items, label }: { items: Array<{ label: string; slug: string }>; label: string }) {
	return <div className="mt-5"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{label}</h2><ul className="mt-2 flex flex-wrap gap-2">{items.map((item) => <li className="rounded-full bg-slate-100 px-3 py-1 text-sm" key={item.slug}>{item.label}</li>)}</ul></div>
}

export function NewsroomLoading() { return <main aria-busy="true" className="min-h-screen bg-white px-6 py-16 text-slate-700"><p className="mx-auto max-w-6xl">Loading newsroom content…</p></main> }

function listingHref(locale: AppLocale, filters: NewsroomFilters, page: number) { const params = new URLSearchParams({ ...filters, page: String(page) }); return `${newsroomPath(locale)}?${params.toString()}` }
function teamPath(locale: AppLocale, slug: string) { const prefix = locale === routing.defaultLocale ? '' : `/${locale}`; return `${prefix}/team/${slug}` }
function formatDate(value: string, locale: AppLocale) { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) }
