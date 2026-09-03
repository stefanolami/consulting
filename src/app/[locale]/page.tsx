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
	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`
	const testRoutes = [
		{ href: `${localePrefix}/team`, label: t('team') },
		{ href: `${localePrefix}/services`, label: t('services') },
		{ href: `${localePrefix}/sectors`, label: t('sectors') },
		{ href: `${localePrefix}/newsroom`, label: t('newsroom') },
		{ href: `${localePrefix}/our-outreach`, label: t('outreach') },
	]

	return (
		<main className="flex min-h-screen flex-col items-center px-6">
			<h1 className="mt-10 font-robo text-3xl text-red-500">
				{t('title')}
			</h1>
			<Link
				className="mt-6 rounded-md bg-[#27335a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e294c]"
				href="/auth/sign-in"
			>
				{t('signIn')}
			</Link>
			<nav aria-label={t('testNavigation')} className="mt-5 border-t border-slate-200 pt-4">
				<p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">{t('testNavigation')}</p>
				<ul className="mt-3 flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
					{testRoutes.map((route) => (
						<li key={route.href}>
							<Link className="text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27335a]" href={route.href}>{route.label}</Link>
						</li>
					))}
				</ul>
			</nav>
		</main>
	)
}
