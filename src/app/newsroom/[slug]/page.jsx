import { notFound } from 'next/navigation'
import NEWS from '@/data/newsroom'
import NewsArticle from '@/components/newsroom/news-article'

export async function generateStaticParams() {
	return NEWS.map((article) => ({
		slug: article.slug,
	}))
}

export async function generateMetadata({ params }) {
	const { slug } = await params
	const article = NEWS.find((article) => article.slug === slug)

	if (!article) {
		return {
			title: 'Article Not Found',
		}
	}

	return {
		title: article.title,
		description: article.subTitle,
		openGraph: {
			title: article.title,
			description: article.subTitle,
			images: [
				`https://www.consultingontap.com/newsroom/${article.image}`,
			],
		},
	}
}

export default async function ArticlePage({ params }) {
	const { slug } = await params
	const article = NEWS.find((article) => article.slug === slug)

	if (!article) {
		notFound()
	}

	return <NewsArticle article={article} />
}
