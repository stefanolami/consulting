import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { NewsroomArticleCard } from '@/lib/public-newsroom'

type ArticleSummaryCardProps = {
	article: NewsroomArticleCard
	/** Localized "By …" line, or null when the article has no authors. */
	byline: string | null
	dateFormat: Intl.DateTimeFormat
	locale: AppLocale
}

// Related-article card shared by team profiles ("Articles by", Figma 5408:536)
// and service/sector details ("Articles for", 5488:464): cover, title with the
// teal marker, excerpt, date and byline. The whole card is one link; articles
// without a cover keep the muted-blue block the designs show.
export function ArticleSummaryCard({ article, byline, dateFormat, locale }: ArticleSummaryCardProps) {
	return (
		<article className="group relative flex h-full flex-col font-label text-black">
			<div className="relative aspect-[360/217] overflow-hidden bg-tp-blue-muted">
				{article.cover ? <Image alt="" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" fill sizes="(min-width: 64rem) 23rem, (min-width: 40rem) 45vw, 90vw" src={article.cover.url} /> : null}
			</div>
			<div className="mt-5 flex items-start justify-between gap-4">
				<h3 className="min-w-0 break-words font-display text-heading-3 font-bold leading-tight">
					<Link className="rounded-control underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus" href={`/newsroom/${article.slug}`} locale={locale}>{article.title}</Link>
				</h3>
				<span aria-hidden="true" className="mt-1 h-10 w-[3.375rem] shrink-0 bg-tp-teal" />
			</div>
			{article.excerpt ? <p className="mt-4 line-clamp-5 text-body-lg">{article.excerpt}</p> : null}
			<p className="mt-4 text-body-lg">
				<time className="block font-bold" dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time>
				{byline ? <span className="block">{byline}</span> : null}
			</p>
		</article>
	)
}
