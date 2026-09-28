import { getTranslations } from 'next-intl/server'

import { ArticleSummaryCard } from '@/components/newsroom/article-summary-card'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { PublicCatalogueKind } from '@/lib/public-catalogue'
import { getPublishedNewsroomListing } from '@/lib/public-newsroom'

const ARTICLE_LIMIT = 3
// Slugs the newsroom filters accept (src/components/newsroom/newsroom-pages.tsx).
const FILTERABLE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// "Articles for …" (Figma 5488:464; the sector frames' "… Projects" heading is
// shown as articles because that is what the data holds). Reads the public
// newsroom listing filtered by this service or sector, so the cards carry
// covers and authors under the newsroom publication rules. Up to three are
// shown, newest first, with a link to the filtered newsroom when there are more.
export async function CatalogueArticles({ kind, locale, name, slug }: { kind: PublicCatalogueKind; locale: AppLocale; name: string; slug: string }) {
	const [listing, t] = await Promise.all([
		getPublishedNewsroomListing(locale, 1, { [kind]: slug }),
		getTranslations({ locale, namespace: 'Catalogue' }),
	])
	const articles = listing.articles.slice(0, ARTICLE_LIMIT)
	if (!articles.length) return null
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
	return (
		<section aria-labelledby="catalogue-articles-heading">
			<h2 className="border-b-2 border-black pb-3 font-display text-heading-2 font-bold text-black" id="catalogue-articles-heading">{t('articlesFor', { name })}</h2>
			<ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
				{articles.map((article) => (
					<li key={article.id}>
						<ArticleSummaryCard
							article={article}
							byline={article.authors.length ? t('byline', { authors: article.authors.map((author) => author.name).join(', ') }) : null}
							dateFormat={dateFormat}
							locale={locale}
						/>
					</li>
				))}
			</ul>
			{listing.total > ARTICLE_LIMIT && FILTERABLE_SLUG.test(slug) ? (
				<p className="mt-10 text-center font-label text-body-lg">
					<Link className="rounded-control font-bold text-brand underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus" href={{ pathname: '/newsroom', query: { [kind]: slug } }} locale={locale}>
						{t('viewAllArticles', { count: listing.total, name })}
					</Link>
				</p>
			) : null}
		</section>
	)
}
