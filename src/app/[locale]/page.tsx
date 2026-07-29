import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'

type HomeProps = {
	params: Promise<{ locale: string }>
}

export default async function Home({ params }: HomeProps) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	setRequestLocale(locale)
	const t = await getTranslations({ locale, namespace: 'HomePage' })

	return (
		<main className="min-h-screen flex flex-col items-center">
			<h1 className="text-3xl text-red-500 font-robo mt-10">
				{t('title')}
			</h1>
		</main>
	)
}
