'use client'

import { useTranslations } from 'next-intl'

import type { PublicCatalogueKind } from '@/lib/public-catalogue'

export function CatalogueLoading({ kind }: { kind: PublicCatalogueKind }) {
	const t = useTranslations('Catalogue')
	return (
		<main aria-busy="true" className="min-h-screen bg-white px-6 py-16 sm:px-10 lg:px-16" role="status">
			<span className="sr-only">{t(`${kind}.loading`)}</span>
			<div aria-hidden="true" className="mx-auto max-w-6xl animate-pulse">
				<div className="h-4 w-28 rounded-full bg-slate-200" />
				<div className="mt-6 h-16 max-w-xl rounded-2xl bg-slate-200" />
				<div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div className="h-72 rounded-[2rem] bg-slate-100" key={index} />)}</div>
			</div>
		</main>
	)
}
