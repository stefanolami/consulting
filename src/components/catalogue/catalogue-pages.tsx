import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { CatalogueArticles } from '@/components/catalogue/catalogue-articles'
import { CatalogueContacts } from '@/components/catalogue/catalogue-contacts'
import { CatalogueDetailSkeleton, CatalogueGridSkeleton } from '@/components/catalogue/catalogue-loading'
import { CatalogueRichText } from '@/components/catalogue/catalogue-rich-text'
import { CATALOGUE_SEGMENT, catalogueGridClass, catalogueItemClass, CatalogueTile } from '@/components/catalogue/catalogue-tile'
import { LoadingMessage } from '@/components/loading/loading-message'
import { LoadingRegion } from '@/components/loading/loading-region'
import { ArticleSummarySectionSkeleton } from '@/components/newsroom/article-summary-card'
import { PageHero, type HeroIllustration } from '@/components/shell/page-hero'
import { routing, type AppLocale } from '@/i18n/routing'
import { hasCatalogueContent } from '@/lib/catalogue-document'
import {
	getPublishedCatalogueDetail,
	getPublishedCatalogueList,
	type PublicCatalogueKind,
} from '@/lib/public-catalogue'

export function cataloguePath(locale: AppLocale, kind: PublicCatalogueKind, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/${CATALOGUE_SEGMENT[kind]}${slug ? `/${slug}` : ''}`
}

function listingLanguages(kind: PublicCatalogueKind) {
	return Object.fromEntries([
		...routing.locales.map((locale) => [locale, cataloguePath(locale, kind)]),
		['x-default', cataloguePath(routing.defaultLocale, kind)],
	])
}

export async function generateCatalogueListingMetadata(
	kind: PublicCatalogueKind,
	locale: AppLocale,
): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Catalogue' })
	const canonical = cataloguePath(locale, kind)
	return {
		alternates: { canonical, languages: listingLanguages(kind) },
		description: t(`${kind}.metaDescription`),
		openGraph: {
			description: t(`${kind}.metaDescription`),
			title: t(`${kind}.title`),
			url: canonical,
		},
		title: t(`${kind}.title`),
	}
}

export async function generateCatalogueDetailMetadata(
	kind: PublicCatalogueKind,
	locale: AppLocale,
	slug: string,
): Promise<Metadata> {
	await connection()
	const detail = await getPublishedCatalogueDetail(kind, locale, slug)
	if (!detail) return { robots: { follow: false, index: false } }
	const canonical = cataloguePath(locale, kind, detail.slug)
	const languages = Object.fromEntries(detail.alternates.map((alternate) => [
		alternate.locale,
		cataloguePath(alternate.locale, kind, alternate.slug),
	]))
	const english = detail.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = cataloguePath(routing.defaultLocale, kind, english.slug)
	const title = detail.seoTitle || detail.name
	const description = detail.seoDescription || detail.summary || undefined
	return {
		alternates: { canonical, languages },
		description,
		openGraph: { description, title, url: canonical },
		title,
	}
}

const SECTORS_HERO_PLACEHOLDER = 'hero-sectors-industry'

// Index heroes (Figma 6393:6 services, 5408:187 sectors). The services gears
// are the legacy line art recoloured white (hero-services-white.png, derived
// from hero-services.png); the sectors skyline is not in the repository yet
// (docs/figma-asset-needs.md).
function listingIllustration(kind: PublicCatalogueKind, placeholderLabel: string): HeroIllustration {
	return kind === 'service'
		? { kind: 'image', src: '/hero/hero-services-white.png', width: 4000, height: 1111 }
		: { kind: 'placeholder', name: SECTORS_HERO_PLACEHOLDER, label: placeholderLabel, aspectRatio: '1440 / 480' }
}

// The hero and intro are static and render immediately; the tiles stream in.
// The Business / Government Institute / Academia audience selector on 6393:6 is
// deliberately omitted until open decision §23.10 is resolved.
export async function CatalogueListingPage({
	kind,
	locale,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
}) {
	const [t, tShell] = await Promise.all([
		getTranslations({ locale, namespace: 'Catalogue' }),
		getTranslations({ locale, namespace: 'Shell.placeholder' }),
	])
	return (
		<main>
			<PageHero illustration={listingIllustration(kind, tShell('illustration', { name: SECTORS_HERO_PLACEHOLDER }))} title={t(`${kind}.title`)}>
				<div className="space-y-4">
					{t(`${kind}.introduction`).split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
				</div>
			</PageHero>
			<section aria-labelledby={`${kind}-catalogue-heading`} className="bg-surface-soft px-gutter py-section">
				<div className="mx-auto max-w-content">
					<h2 className="sr-only" id={`${kind}-catalogue-heading`}>{t(`${kind}.catalogueLabel`)}</h2>
					<Suspense fallback={<LoadingRegion label={t(`${kind}.loading`)}><CatalogueGridSkeleton kind={kind} /></LoadingRegion>}>
						<CatalogueGrid kind={kind} locale={locale} />
					</Suspense>
				</div>
			</section>
		</main>
	)
}

// Tiles enter in sequence on page load only when motion is allowed; without
// it they are simply there.
async function CatalogueGrid({ kind, locale }: { kind: PublicCatalogueKind; locale: AppLocale }) {
	await connection()
	const [items, t] = await Promise.all([
		getPublishedCatalogueList(kind, locale),
		getTranslations({ locale, namespace: 'Catalogue' }),
	])
	if (!items.length) {
		return (
			<div className="mx-auto max-w-2xl rounded-panel border border-dashed border-tp-mist bg-white px-6 py-12 text-center text-brand" role="status">
				<p className="font-display text-heading-3 font-bold">{t(`${kind}.emptyTitle`)}</p>
				<p className="mt-3 font-label text-body-lg">{t(`${kind}.emptyDescription`)}</p>
			</div>
		)
	}
	return (
		<ul className={catalogueGridClass}>
			{items.map((item, index) => (
				<li className={`${catalogueItemClass} motion-safe:animate-tile-in`} key={item.id} style={{ animationDelay: `${Math.min(index, 11) * 70}ms` }}>
					<CatalogueTile index={index} item={item} kind={kind} locale={locale} />
				</li>
			))}
		</ul>
	)
}

// One template for every service and sector (Figma 5488:464 … 5488:970,
// 5408:267 … 5480:1294; mobile 5695:437, 5695:370). Every section after the
// hero renders only when it has content.
export function CatalogueDetailPage({
	kind,
	locale,
	slug,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
	slug: string
}) {
	return <Suspense fallback={<CatalogueDetailSkeleton label={<LoadingMessage messageKey={`Catalogue.${kind}.loadingDetail`} />} />}><CatalogueDetailContent kind={kind} locale={locale} slug={slug} /></Suspense>
}

async function CatalogueDetailContent({
	kind,
	locale,
	slug,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
	slug: string
}) {
	await connection()
	const [detail, t, tShell] = await Promise.all([
		getPublishedCatalogueDetail(kind, locale, slug),
		getTranslations({ locale, namespace: 'Catalogue' }),
		getTranslations({ locale, namespace: 'Shell' }),
	])
	if (!detail) notFound()
	const iconName = `${kind}-icon-${detail.slug}`
	// The CMS icon is decorative (the title follows it). A missing icon shows a
	// visible placeholder (docs/figma-asset-needs.md).
	const illustration: HeroIllustration = detail.icon
		? { kind: 'emblem', src: detail.icon.url }
		: { kind: 'emblem-placeholder', name: iconName, label: tShell('placeholder.illustration', { name: iconName }) }
	return (
		<main>
			<article>
				<PageHero illustration={illustration} title={detail.name}>
					{detail.summary ? <p>{detail.summary}</p> : null}
				</PageHero>
				<div className="mx-auto max-w-content space-y-[clamp(3rem,2.25rem+3vw,5.5rem)] px-gutter py-section empty:hidden">
					{hasCatalogueContent(detail.content) ? (
						<section aria-labelledby="catalogue-body-heading">
							<h2 className="font-display text-heading-2 font-bold uppercase text-black" id="catalogue-body-heading">{t('whatWeDo')}</h2>
							<CatalogueRichText className="mt-[clamp(1.25rem,1rem+1vw,2rem)] text-black" content={detail.content} />
						</section>
					) : null}
					<CatalogueContacts contacts={detail.contacts} labels={{ email: t('email'), heading: t('getInTouch'), phone: t('phone') }} locale={locale} />
					<Suspense fallback={<LoadingRegion label={tShell('loading.articles')}><ArticleSummarySectionSkeleton /></LoadingRegion>}>
						<CatalogueArticles kind={kind} locale={locale} name={detail.name} slug={detail.slug} />
					</Suspense>
				</div>
			</article>
		</main>
	)
}
