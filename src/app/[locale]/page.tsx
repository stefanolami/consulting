import { hasLocale } from 'next-intl'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { GlobalContentProof } from '@/components/home/global-content-proof'
import { PageHero } from '@/components/shell/page-hero'
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
	const [t, tShell] = await Promise.all([getTranslations({ locale, namespace: 'HomePage' }), getTranslations({ locale, namespace: 'Shell.placeholder' })])
	const localePrefix = locale === routing.defaultLocale ? '' : `/${locale}`
	const testRoutes = [
		{ href: `${localePrefix}/who-we-are`, label: t('team') },
		{ href: `${localePrefix}/services`, label: t('services') },
		{ href: `${localePrefix}/sectors`, label: t('sectors') },
		{ href: `${localePrefix}/newsroom`, label: t('newsroom') },
		{ href: `${localePrefix}/our-outreach`, label: t('outreach') },
	]

	return (
		<main>
			{/* PLACEHOLDER illustration: the Figma homepage doors line drawing is not in the repository (docs/figma-asset-needs.md). */}
			<PageHero
				illustration={{ kind: 'placeholder', name: 'hero-homepage-doors', label: tShell('illustration', { name: 'hero-homepage-doors' }), aspectRatio: '1440 / 497' }}
				title={<><span className="block text-[clamp(2rem,1.3rem+2.8vw,3.875rem)] leading-tight">{t('heroLead')}</span><span className="block text-[clamp(2.75rem,1.7rem+4.2vw,5.3125rem)] uppercase leading-none">{t('heroEmphasis')}</span></>}
				titleVariant="display"
			/>
			<div className="flex flex-col items-center px-6">
			<h2 className="mt-10 font-robo text-3xl text-red-500">
				{t('title')}
			</h2>
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
			<Suspense fallback={null}>
				<GlobalContentProof labels={{ contact: t('contact'), endorsements: t('endorsements'), partners: t('partners'), socials: t('socials') }} locale={locale} />
			</Suspense>
			</div>
		</main>
	)
}
