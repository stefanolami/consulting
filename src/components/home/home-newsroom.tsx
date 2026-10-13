import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { ArticleKindIcon, isArticleKind } from '@/components/newsroom/article-kind'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedArticleSelection, type NewsroomArticleCard } from '@/lib/public-newsroom'
import { cn } from '@/lib/utils'

import { HomeNewsroomCarousel } from './home-newsroom-carousel'

// Provisional default (control tower §23.13): the newest published articles
// in the locale, under the newsroom publication rules.
const ARTICLE_LIMIT = 5

const sectionClass = 'bg-surface-soft px-gutter py-section text-black'
const eyebrowClass = 'block font-serif text-lead font-medium uppercase'
const titleClass = 'mt-2 block font-serif text-heading-2 font-normal uppercase'
// The navy frame (Figma "Group 10"): a landscape card with the text panel over
// the picture from `lg` (5411:829), a portrait card with the panel below it on
// narrow screens (5651:646).
const frameClass = 'relative mx-auto mt-[clamp(2rem,1rem+3.5vw,5.3125rem)] max-w-[36rem] border-[clamp(0.375rem,0.3rem+0.3vw,0.625rem)] border-tp-blue bg-tp-blue lg:max-w-content'
const slideClass = 'flex h-full flex-col bg-tp-blue text-on-brand lg:relative'
// Without a cover the muted-blue block stays, as on the newsroom cards.
const mediaClass = 'relative aspect-[4/5] overflow-hidden bg-tp-blue-muted sm:aspect-[4/3] lg:aspect-[1100/459]'
const panelClass = 'flex flex-1 flex-col bg-tp-blue px-4 pb-4 pt-3 lg:absolute lg:bottom-[1.5625rem] lg:left-[1.5625rem] lg:min-h-[8.75rem] lg:w-[26.5625rem] lg:flex-none lg:pb-3'
const slideTitleClass = 'font-serif text-heading-3 font-normal wrap-anywhere [hyphens:auto] line-clamp-4 lg:line-clamp-3'
const kindClass = 'mt-1 font-serif text-label'
const excerptClass = 'mt-4 font-serif text-label line-clamp-4 lg:line-clamp-3'
const viewArticleClass = 'shrink-0 border border-on-brand px-2 py-0.5 font-serif text-body font-semibold italic transition-colors hover:bg-on-brand/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark motion-reduce:transition-none'
const viewAllClass = 'mt-[clamp(1.5rem,1rem+1.5vw,2.5rem)] text-center font-label text-body-lg'

type HomeNewsroomProps = { locale: AppLocale }

// Figma homepage newsroom feature ("STAY UPDATED WITH OUR TIME&PLACE
// NEWSROOM", 5408:616 and 5651:631). The latest articles stream behind a
// template-shaped skeleton; a locale with no published article renders no
// section at all.
export async function HomeNewsroom({ locale }: HomeNewsroomProps) {
	const t = await getTranslations({ locale, namespace: 'HomePage.newsroom' })
	return (
		<Suspense
			fallback={
				<>
					<LoadingRegion as="section" className={sectionClass} label={t('loading')}>
						<HomeNewsroomSkeleton />
					</LoadingRegion>
					{/* Streamed sections are revealed by script (control tower §23.14),
					    so without JavaScript the skeleton stays: keep the newsroom
					    reachable from here. */}
					<noscript>
						<p className={cn(sectionClass, 'pt-0 text-center font-label text-body-lg')}>
							<Link className="font-bold text-brand underline underline-offset-4" href="/newsroom">{t('viewAll')}</Link>
						</p>
					</noscript>
				</>
			}
		>
			<HomeNewsroomContent locale={locale} />
		</Suspense>
	)
}

async function HomeNewsroomContent({ locale }: HomeNewsroomProps) {
	await connection()
	const [{ articles }, t, tNewsroom] = await Promise.all([
		getPublishedArticleSelection(locale, {}, ARTICLE_LIMIT),
		getTranslations({ locale, namespace: 'HomePage.newsroom' }),
		getTranslations({ locale, namespace: 'Newsroom' }),
	])
	if (!articles.length) return null
	return (
		<section aria-labelledby="home-newsroom-heading" className={sectionClass}>
			<h2 className="text-center" id="home-newsroom-heading">
				<span className={eyebrowClass}>{t.rich('eyebrow', { strong: (chunks) => <strong className="font-bold">{chunks}</strong> })}</span>
				<span className={titleClass}>{t('title')}</span>
			</h2>
			<HomeNewsroomCarousel
				className={frameClass}
				labelledBy="home-newsroom-heading"
				slides={articles.map((article) => ({
					id: article.id,
					content: <HomeNewsroomSlide article={article} kindLabel={isArticleKind(article.kind) ? tNewsroom(`kinds.${article.kind}`) : null} viewArticle={t('viewArticle')} />,
				}))}
			/>
			<p className={viewAllClass}>
				<Link className="rounded-control font-bold text-brand underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus" href="/newsroom">{t('viewAll')}</Link>
			</p>
		</section>
	)
}

type HomeNewsroomSlideProps = { article: NewsroomArticleCard; kindLabel: string | null; viewArticle: string }

// One slide: the cover, the kind icon (over the picture from `lg`, in the
// panel below it), the title, kind label and excerpt, and "View article" as the
// slide's only link. Its accessible name adds the title, because every slide
// has the same visible text. Links take the request locale without a `locale`
// prop, so English paths stay unprefixed (control tower §15.11).
function HomeNewsroomSlide({ article, kindLabel, viewArticle }: HomeNewsroomSlideProps) {
	const kind = isArticleKind(article.kind) ? article.kind : null
	return (
		<article className={slideClass}>
			<div className={mediaClass}>
				{article.cover ? <Image alt="" className="object-cover" fill sizes="(min-width: 64rem) 70rem, (min-width: 40rem) 36rem, 92vw" src={article.cover.url} /> : null}
				{kind ? <ArticleKindIcon className="absolute right-3 top-3 hidden size-[clamp(3rem,1rem+3vw,4.4rem)] text-on-brand drop-shadow-[0_1px_3px_rgb(0_0_0/0.7)] lg:block" kind={kind} /> : null}
			</div>
			<div className={panelClass}>
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<h3 className={slideTitleClass}>{article.title}</h3>
						{kindLabel ? <p className={kindClass}>{kindLabel}</p> : null}
						{kind ? <ArticleKindIcon className="mt-3 size-12 lg:hidden" kind={kind} /> : null}
					</div>
					<Link className={viewArticleClass} href={`/newsroom/${article.slug}`}>
						<span aria-hidden="true">&gt;</span>{viewArticle}<span className="sr-only">: {article.title}</span>
					</Link>
				</div>
				{article.excerpt ? <p className={excerptClass}>{article.excerpt}</p> : null}
			</div>
		</article>
	)
}

// Loading shape: heading, one slide in the frame, and the "View all" line.
export function HomeNewsroomSkeleton() {
	return (
		<>
			<div className="text-center">
				<SkeletonText className={cn(eyebrowClass, 'mx-auto w-80 max-w-full')} lastLineWidth="w-full" />
				<SkeletonText className={cn(titleClass, 'mx-auto w-52 max-w-full')} lastLineWidth="w-full" />
			</div>
			<div className={frameClass}>
				<div className={slideClass}>
					<div className={mediaClass}>
						<Skeleton className="absolute inset-0 rounded-none" tone="brand" />
					</div>
					<div className={panelClass}>
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0 flex-1">
								<SkeletonText className={slideTitleClass} lastLineWidth="w-2/3" lines={2} tone="brand" />
								<SkeletonText className={cn(kindClass, 'w-24')} lastLineWidth="w-full" tone="brand" />
							</div>
							<Skeleton className="h-[1.85rem] w-28 rounded-none" tone="brand" />
						</div>
						<SkeletonText className={excerptClass} lastLineWidth="w-3/4" lines={3} tone="brand" />
					</div>
				</div>
			</div>
			<SkeletonText className={cn(viewAllClass, 'mx-auto w-56')} lastLineWidth="w-full" />
		</>
	)
}
