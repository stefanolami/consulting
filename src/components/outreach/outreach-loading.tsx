'use client'

import { useTranslations } from 'next-intl'

export function OutreachLoading() {
	const t = useTranslations('Outreach')
	return <main aria-busy="true" className="min-h-screen bg-white px-6 py-16 text-slate-900"><div className="mx-auto max-w-6xl"><p className="sr-only" role="status">{t('loading')}</p><div aria-hidden="true" className="h-12 w-72 animate-pulse rounded bg-slate-200" /><div aria-hidden="true" className="mt-10 aspect-[1.9/1] w-full animate-pulse rounded-lg bg-slate-100" /></div></main>
}
