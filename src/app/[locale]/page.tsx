import { Locale, useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { use } from 'react'

export default function Home({ params }: PageProps<'/[locale]'>) {
	const { locale } = use(params)

	// Enable static rendering
	setRequestLocale(locale as Locale)
	const t = useTranslations('HomePage')
	return (
		<main className="min-h-screen flex flex-col items-center">
			<h1 className="text-3xl text-red-500 font-robo mt-10">
				{t('title')}
			</h1>
		</main>
	)
}
