'use client'

import { useTranslations } from 'next-intl'

export default function NewsroomError() {
	const t = useTranslations('Newsroom')
	return <main className="min-h-screen bg-white px-6 py-16 text-slate-900"><div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6" role="alert"><h1 className="text-xl font-semibold">{t('errorTitle')}</h1><p className="mt-2 text-slate-700">{t('errorDescription')}</p></div></main>
}
