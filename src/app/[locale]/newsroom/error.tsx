'use client'

import { useTranslations } from 'next-intl'

export default function NewsroomError() {
	const t = useTranslations('Newsroom')
	return <main className="px-gutter py-section"><div className="mx-auto max-w-2xl rounded-panel border border-dashed border-tp-mist bg-surface-soft px-6 py-12 text-center text-brand" role="alert"><h1 className="font-display text-heading-3 font-bold">{t('errorTitle')}</h1><p className="mt-3 font-label text-body-lg">{t('errorDescription')}</p></div></main>
}
