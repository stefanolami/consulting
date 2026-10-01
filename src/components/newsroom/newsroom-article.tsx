import Image from 'next/image'
import type { ReactNode } from 'react'

import { CatalogueContacts, CatalogueContactsSkeleton } from '@/components/catalogue/catalogue-contacts'
import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonSection, SkeletonText } from '@/components/loading/skeleton-text'
import { ArticleKindIcon, isArticleKind } from '@/components/newsroom/article-kind'
import { ArticleSummarySectionSkeleton } from '@/components/newsroom/article-summary-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { NewsroomAuthor, NewsroomDetail, NewsroomFilterOption, NewsroomFilters } from '@/lib/public-newsroom'
import { getPublishedTeamProfile } from '@/lib/public-team'
import { TEAM_SEGMENT } from '@/lib/team-paths'
import { cn } from '@/lib/utils'

const headerInnerClass = 'mx-auto max-w-content px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)]'
const kindClass = 'flex items-center gap-3 font-serif text-body uppercase tracking-wide'
const titleClass = 'mt-4 font-serif text-heading-1 font-bold wrap-anywhere [hyphens:auto]'
const excerptClass = 'mt-6 max-w-4xl font-label text-lead'
const metaClass = 'mt-8 font-label text-body-lg'
const coverClass = 'relative mx-auto aspect-[1440/600] max-w-[90rem] overflow-hidden bg-tp-blue-muted'
/** Body sections share the Figma ruled heading ("More About the Author", "Similar Articles"). */
export const articleSectionHeadingClass = 'border-b-2 border-black pb-3 font-display text-heading-2 font-bold text-black'
export const articleBodyClass = 'mx-auto max-w-content space-y-[clamp(3rem,2.25rem+3vw,5.5rem)] px-gutter py-section'
const linkOnDarkClass = 'rounded-control underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark'

// Navy article header. Figma (5534:989, 5542:2) leaves this area as an empty
// navy block or a full-bleed photograph, so it carries the kind, title,
// excerpt, authors and date; the cover follows it at full width.
export function ArticleHeader({ article, bylineTemplate, dateFormat, kindLabel, locale }: { article: NewsroomDetail; /** The raw `By {authors}` message, so the names can be links. */ bylineTemplate: string; dateFormat: Intl.DateTimeFormat; kindLabel: string | null; locale: AppLocale }) {
	return (
		<header className="bg-brand text-on-brand">
			<div className={headerInnerClass}>
				{kindLabel && isArticleKind(article.kind) ? <p className={kindClass}><ArticleKindIcon className="size-8" kind={article.kind} />{kindLabel}</p> : null}
				<h1 className={titleClass}>{article.title}</h1>
				{article.excerpt ? <p className={excerptClass}>{article.excerpt}</p> : null}
				<p className={metaClass}>
					{article.authors.length ? <span className="block">{bylineTemplate.split('{authors}')[0]}<AuthorNames authors={article.authors} locale={locale} />{bylineTemplate.split('{authors}')[1]}</span> : null}
					<time className="block font-bold" dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time>
				</p>
			</div>
		</header>
	)
}

function AuthorNames({ authors, locale }: { authors: NewsroomAuthor[]; locale: AppLocale }) {
	return authors.map((author, index) => (
		<span key={author.id}>
			{index ? ', ' : null}
			{author.profileSlug ? <Link className={linkOnDarkClass} href={`/${TEAM_SEGMENT}/${author.profileSlug}`} locale={locale}>{author.name}</Link> : author.name}
		</span>
	))
}

export function ArticleCover({ article, externalMediaLabel }: { article: NewsroomDetail; externalMediaLabel: string }) {
	if (article.cover) {
		return (
			<figure>
				<div className={coverClass}>
					<Image alt={article.cover.alt} className="object-cover" fill priority sizes="(min-width: 90rem) 90rem, 100vw" src={article.cover.url} />
				</div>
				{article.cover.caption ? <figcaption className="mx-auto mt-3 max-w-content px-gutter font-label text-body text-black/75">{article.cover.caption}</figcaption> : null}
			</figure>
		)
	}
	if (!article.externalMediaUrl) return null
	return (
		<p className="mx-auto max-w-content px-gutter pt-section font-label text-body-lg">
			<a className="inline-block bg-tp-blue px-6 py-3 font-serif uppercase text-on-brand hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href={article.externalMediaUrl} rel="noreferrer" target="_blank">{externalMediaLabel}</a>
		</p>
	)
}

// Tags, services and sectors as links to the matching newsroom filter.
export function ArticleTopics({ groups, heading, locale }: { groups: Array<{ items: NewsroomFilterOption[]; key: keyof NewsroomFilters; label: string }>; heading: string; locale: AppLocale }) {
	const present = groups.filter((group) => group.items.length)
	if (!present.length) return null
	return (
		<section aria-labelledby="article-topics-heading">
			<h2 className={articleSectionHeadingClass} id="article-topics-heading">{heading}</h2>
			<dl className="mt-6 grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-x-8">
				{present.map((group) => (
					<div className="contents" key={group.key}>
						<dt className="font-serif text-body font-bold uppercase text-brand sm:pt-1.5">{group.label}</dt>
						<dd>
							<ul className="flex flex-wrap gap-2">
								{group.items.map((item) => (
									<li key={item.slug}>
										<Link className="inline-block rounded-pill border border-tp-blue px-4 py-1.5 font-label text-body text-brand transition-colors hover:bg-tp-blue hover:text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none" href={{ pathname: '/newsroom', query: { [group.key]: item.slug } }} locale={locale}>{item.label}</Link>
									</li>
								))}
							</ul>
						</dd>
					</div>
				))}
			</dl>
		</section>
	)
}

export function ArticleSources({ heading, sources }: { heading: string; sources: NewsroomDetail['sources'] }) {
	if (!sources.length) return null
	return (
		<section aria-labelledby="article-sources-heading">
			<h2 className={articleSectionHeadingClass} id="article-sources-heading">{heading}</h2>
			<ol className="mt-6 list-decimal space-y-2 pl-6 font-label text-body-lg text-black marker:font-bold">
				{sources.map((source) => (
					<li key={`${source.label}-${source.url}`}>
						<a className="rounded-control break-words underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href={source.url} rel="noreferrer" target="_blank">{source.label}</a>
					</li>
				))}
			</ol>
		</section>
	)
}

// "More About the Author" (5534:989): portrait and contact lines of every
// author with a published team profile in this locale, as in the service and
// sector contacts. Authors without a profile appear only in the byline.
export async function ArticleAuthors({ authors, labels, locale }: { authors: NewsroomAuthor[]; labels: { email: string; heading: (count: number) => string; phone: string }; locale: AppLocale }) {
	const profiles = (await Promise.all(authors.flatMap((author) => author.profileSlug ? [getPublishedTeamProfile(locale, author.profileSlug)] : []))).filter((profile) => profile !== null)
	if (!profiles.length) return null
	return (
		<CatalogueContacts
			contacts={profiles.map((profile) => ({ cardName: profile.name, email: profile.email, id: profile.id, phone: profile.phone, portrait: profile.portrait ? { alt: '', url: profile.portrait.url } : null, role: profile.roles[0] ?? null, slug: profile.slug }))}
			headingId="article-authors-heading"
			labels={{ email: labels.email, heading: labels.heading(profiles.length), phone: labels.phone }}
			locale={locale}
		/>
	)
}

export function ArticleAuthorsSkeleton({ label }: { label: string }) {
	return <LoadingRegion label={label}><CatalogueContactsSkeleton count={1} /></LoadingRegion>
}

// The whole article while it loads: header, cover, body, authors and similar
// articles in the finished layout.
export function NewsroomDetailSkeleton({ label }: { label: ReactNode }) {
	return (
		<LoadingRegion as="main" label={label}>
			<div className="bg-brand">
				<div className={headerInnerClass}>
					<SkeletonText className={cn(kindClass, 'w-48')} lastLineWidth="w-full" tone="brand" />
					<SkeletonText className={cn(titleClass, 'max-w-4xl')} lastLineWidth="w-2/3" lines={2} tone="brand" />
					<SkeletonText className={excerptClass} lastLineWidth="w-1/2" lines={2} tone="brand" />
					<SkeletonText className={cn(metaClass, 'w-64')} lastLineWidth="w-2/3" lines={2} tone="brand" />
				</div>
			</div>
			<Skeleton className={cn(coverClass, 'rounded-none bg-tp-mist/60')} tone="light" />
			<div className={articleBodyClass}>
				<SkeletonSection bodyClassName="font-label text-body-lg" headingWidth="w-1/3" lines={9} />
				<CatalogueContactsSkeleton count={1} />
				<ArticleSummarySectionSkeleton />
			</div>
		</LoadingRegion>
	)
}
