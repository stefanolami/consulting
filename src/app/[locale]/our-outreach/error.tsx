'use client'

import { useTranslations } from 'next-intl'

// Shown when the Our Outreach reads fail (overview and country pages).
export default function OutreachError() {
	const t = useTranslations('Outreach')
	return (
		<main className="bg-surface-soft px-gutter py-section">
			<div className="mx-auto max-w-content border-l-4 border-error bg-white px-6 py-8" role="alert">
				<h1 className="font-display text-heading-2 font-bold text-tp-navy">{t('errorTitle')}</h1>
				<p className="mt-3 font-label text-body-lg text-tp-navy">{t('errorDescription')}</p>
			</div>
		</main>
	)
}
