import Image from 'next/image'

import { SkeletonText } from '@/components/loading/skeleton-text'
import { ArticleKindIcon, isArticleKind } from '@/components/newsroom/article-kind'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { NewsroomArticleCard } from '@/lib/public-newsroom'
import { cn } from '@/lib/utils'

export type NewsroomCardLabels = {
	/** Localized kind label, or null for a kind without one. */
	kind: string | null
	readMore: string
}

type NewsroomCardProps = {
	article: NewsroomArticleCard
	dateFormat: Intl.DateTimeFormat
	labels: NewsroomCardLabels
	locale: AppLocale
}

/** Two columns from `md`, one below (Figma 5408:334, mobile 5651:90). */
export const newsroomGridClass = 'grid gap-[clamp(1.25rem,0.9rem+1.2vw,1.5rem)] md:grid-cols-2'

const cardClass = 'group relative flex h-full flex-col border border-tp-blue has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-focus'
const bodyClass = 'flex flex-1 flex-col p-[clamp(1.25rem,1rem+1vw,1.75rem)]'
const titleClass = 'font-serif text-heading-3 wrap-anywhere [hyphens:auto]'
const metaClass = 'font-serif text-label'
const excerptClass = 'mt-4 font-serif text-body'
const imageClass = 'object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none'
const navyClass = 'bg-tp-blue text-on-brand'
const whiteClass = 'bg-white text-black'

// Tones follow the Figma rhythm: on the two-column grid white and navy
// alternate like a chequerboard (5408:334 rows one and three); in the single
// mobile column they simply alternate (5651:90). Colours are inherited, so one
// class switch recolours the title, meta, icon and button together.
function gridTone(index: number) {
	const column = index % 2
	const mobileNavy = index % 2 === 1
	const desktopNavy = (Math.floor(index / 2) + column) % 2 === 1
	const tone = mobileNavy === desktopNavy
		? (desktopNavy ? navyClass : whiteClass)
		: mobileNavy
			? 'max-md:bg-tp-blue max-md:text-on-brand md:bg-white md:text-black'
			: 'max-md:bg-white max-md:text-black md:bg-tp-blue md:text-on-brand'
	return { column, desktopNavy, tone }
}

// Newsroom listing card. The title link covers the whole card; "Read more" is
// its visual affordance only, so each card is one link and one tab stop. On
// the navy tone the desktop layout splits, with the picture on the side facing
// the other column (5408:334 "NEWS 2" and "NEWS 4"); elsewhere the picture sits
// on top. Without a cover the white card keeps the muted-blue block and the
// navy card drops the picture column.
export function NewsroomCard({ article, dateFormat, index, labels, locale }: NewsroomCardProps & { index: number }) {
	const { column, desktopNavy, tone } = gridTone(index)
	const split = desktopNavy && Boolean(article.cover)
	return (
		<article className={cn(cardClass, tone, split && (column === 0 ? 'md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : 'md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'))}>
			<div className={cn('relative aspect-[550/234] overflow-hidden bg-tp-blue-muted', split && 'md:aspect-auto md:min-h-[18rem]', split && column === 0 && 'md:order-last', !article.cover && desktopNavy && 'md:hidden')}>
				{article.cover ? <Image alt="" className={imageClass} fill sizes="(min-width: 48rem) 34rem, 92vw" src={article.cover.url} /> : null}
			</div>
			<div className={bodyClass}>
				<CardHeading article={article} labels={labels} locale={locale} split={split} />
				{article.excerpt ? <p className={cn(excerptClass, split ? 'line-clamp-4 md:line-clamp-8' : 'line-clamp-4')}>{article.excerpt}</p> : null}
				<CardFooter article={article} dateFormat={dateFormat} readMore={labels.readMore} />
			</div>
		</article>
	)
}

// Full-width lead story (5408:334 "NEWS 3"): the cover behind a navy scrim
// strong enough for white text on any photograph (about 5:1 or better).
export function NewsroomLeadCard({ article, dateFormat, labels, locale }: NewsroomCardProps) {
	return (
		<article className={cn(cardClass, 'isolate overflow-hidden bg-tp-blue text-center text-on-brand')}>
			{article.cover ? (
				<>
					<Image alt="" className={cn(imageClass, '-z-20')} fill priority sizes="(min-width: 70rem) 70rem, 100vw" src={article.cover.url} />
					<span aria-hidden="true" className="absolute inset-0 -z-10 bg-tp-blue/80" />
				</>
			) : null}
			<div className="flex min-h-[clamp(18rem,14rem+10vw,22rem)] flex-col items-center justify-center px-[clamp(1.25rem,0.5rem+3vw,4rem)] py-[clamp(2rem,1.5rem+2vw,3rem)]">
				{isArticleKind(article.kind) ? <ArticleKindIcon className="absolute right-[clamp(1rem,0.75rem+1vw,1.75rem)] top-[clamp(1rem,0.75rem+1vw,1.75rem)] size-[clamp(2rem,1.6rem+1vw,3rem)]" kind={article.kind} /> : null}
				<h3 className="max-w-4xl font-serif text-heading-2 wrap-anywhere [hyphens:auto]">
					<Link className="outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4" href={`/newsroom/${article.slug}`} locale={locale}>{article.title}</Link>
				</h3>
				{labels.kind ? <p className={cn(metaClass, 'mt-2')}>{labels.kind}</p> : null}
				{article.excerpt ? <p className={cn(excerptClass, 'line-clamp-3 max-w-4xl')}>{article.excerpt}</p> : null}
				<CardFooter article={article} centered dateFormat={dateFormat} readMore={labels.readMore} />
			</div>
		</article>
	)
}

// In a split card (desktop) the column is narrow, so the kind icon moves from
// beside the title onto the kind line and the title keeps the full width.
function CardHeading({ article, labels, locale, split = false }: Pick<NewsroomCardProps, 'article' | 'labels' | 'locale'> & { split?: boolean }) {
	const kind = isArticleKind(article.kind) ? article.kind : null
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<h3 className={titleClass}>
					<Link className="outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4" href={`/newsroom/${article.slug}`} locale={locale}>{article.title}</Link>
				</h3>
				{labels.kind ? <p className={cn(metaClass, 'mt-1 flex items-center gap-2')}>{kind && split ? <ArticleKindIcon className="hidden size-6 md:block" kind={kind} /> : null}{labels.kind}</p> : null}
			</div>
			{kind ? <ArticleKindIcon className={cn('size-[clamp(2.25rem,1.9rem+1vw,3.25rem)]', split && labels.kind && 'md:hidden')} kind={kind} /> : null}
		</div>
	)
}

function CardFooter({ article, centered = false, dateFormat, readMore }: { article: NewsroomArticleCard; centered?: boolean; dateFormat: Intl.DateTimeFormat; readMore: string }) {
	return (
		<div className={cn('mt-auto flex flex-wrap items-end gap-x-6 gap-y-4 pt-6', centered ? 'justify-center' : 'justify-between')}>
			<p className={cn(metaClass, centered && 'text-center')}>
				{article.authors.length ? <span className="block">{article.authors.map((author) => author.name).join(', ')}</span> : null}
				<time className="block" dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time>
			</p>
			<span aria-hidden="true" className="border border-current px-4 py-2 font-serif text-label uppercase transition-colors group-hover:bg-current/10 motion-reduce:transition-none">{readMore}</span>
		</div>
	)
}

// Loading shape of a white card; a streamed grid alternates it with a navy one.
export function NewsroomCardSkeleton({ index }: { index: number }) {
	const navy = index % 2 === 1
	return (
		<div className={cn('flex h-full flex-col border', navy ? 'border-tp-blue/30 bg-tp-blue/10' : 'border-tp-mist')}>
			<Skeleton className="aspect-[550/234] rounded-none" tone="light" />
			<div className={bodyClass}>
				<SkeletonText className={cn(titleClass, 'w-4/5')} lastLineWidth="w-3/5" lines={2} />
				<SkeletonText className={cn(metaClass, 'mt-1')} lastLineWidth="w-1/4" />
				<SkeletonText className={excerptClass} lastLineWidth="w-2/3" lines={3} />
				<div className="mt-auto flex items-end justify-between gap-6 pt-6">
					<SkeletonText className={cn(metaClass, 'w-32')} lastLineWidth="w-3/4" lines={2} />
					<Skeleton className="h-[2.4rem] w-28 rounded-none" tone="light" />
				</div>
			</div>
		</div>
	)
}
