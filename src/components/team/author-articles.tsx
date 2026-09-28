import { getTranslations } from 'next-intl/server'

import { ArticleSummaryCard, articleSummaryGridClass } from '@/components/newsroom/article-summary-card'
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
			<ul className={articleSummaryGridClass}>
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
		</section>
	)
}
