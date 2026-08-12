import { hasLocale } from 'next-intl'
import Link from 'next/link'
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
			<Link
				className="mt-6 rounded-md bg-[#27335a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e294c]"
				href="/auth/sign-in"
			>
				Sign in
			</Link>
		</main>
	)
}
