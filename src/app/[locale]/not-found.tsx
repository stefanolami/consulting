import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

export default async function LocalizedNotFound() {
	const t = await getTranslations('NotFound')
	return (
		<main className="flex min-h-screen items-center bg-[#eef1f7] px-6 py-16 text-[#27335a] sm:px-10 lg:px-16">
			<div className="mx-auto w-full max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
				<p className="font-jose text-sm font-semibold uppercase tracking-[0.2em] text-[#53617f]">404</p>
				<h1 className="mt-4 font-unna text-5xl leading-tight sm:text-6xl">{t('title')}</h1>
				<p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{t('description')}</p>
				<Link className="mt-8 inline-flex rounded-full bg-[#27335a] px-6 py-3 font-jose text-sm font-semibold text-white transition hover:bg-[#1e294c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27335a]" href="/">{t('home')}</Link>
			</div>
		</main>
	)
}
