import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedArticlesByAuthor } from '@/lib/public-newsroom'

const ARTICLE_LIMIT = 3

// "Articles by …" (Figma 5408:536): up to three published articles in this
// locale. Hidden when the person has none, as in the Wilson and Benjamin frames.
export async function AuthorArticles({ locale, name, personId }: { locale: AppLocale; name: string; personId: string }) {
	const [articles, t] = await Promise.all([
		getPublishedArticlesByAuthor(locale, personId, ARTICLE_LIMIT),
		getTranslations({ locale, namespace: 'Team.profile' }),
	])
	if (!articles.length) return null
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
	return (
		<section aria-labelledby="profile-articles-heading">
			<h2 className="border-b-2 border-black pb-3 font-display text-heading-2 font-bold text-black" id="profile-articles-heading">{t('articlesBy', { name })}</h2>
			<ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
				{articles.map((article) => (
					<li className="group relative flex flex-col font-label text-black" key={article.id}>
						<div className="relative aspect-[360/217] overflow-hidden bg-tp-blue-muted">
							{article.cover ? <Image alt="" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" fill sizes="(min-width: 64rem) 23rem, (min-width: 40rem) 45vw, 90vw" src={article.cover.url} /> : null}
						</div>
						<div className="mt-5 flex items-start justify-between gap-4">
							<h3 className="font-display text-heading-3 font-bold leading-tight">
								<Link className="rounded-control underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus" href={`/newsroom/${article.slug}`} locale={locale}>{article.title}</Link>
							</h3>
							<span aria-hidden="true" className="mt-1 h-10 w-[3.375rem] shrink-0 bg-tp-teal" />
						</div>
						{article.excerpt ? <p className="mt-4 line-clamp-5 text-body-lg">{article.excerpt}</p> : null}
						<p className="mt-4 text-body-lg">
							<time className="block font-bold" dateTime={article.publishedAt}>{dateFormat.format(new Date(article.publishedAt))}</time>
							{article.authors.length ? <span className="block">{t('byline', { authors: article.authors.map((author) => author.name).join(', ') })}</span> : null}
						</p>
					</li>
				))}
			</ul>
		</section>
	)
}
