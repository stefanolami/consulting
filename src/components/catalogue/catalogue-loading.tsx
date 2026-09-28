'use client'

import { useTranslations } from 'next-intl'

import { catalogueGridClass, catalogueItemClass } from '@/components/catalogue/catalogue-tile'
import type { PublicCatalogueKind } from '@/lib/public-catalogue'
import { cn } from '@/lib/utils'

// Route-level loading state in the shape of the Figma pages: the navy hero,
// then the tile grid (index) or an empty body (detail).
export function CatalogueLoading({ kind, variant = 'listing' }: { kind: PublicCatalogueKind; variant?: 'detail' | 'listing' }) {
	const t = useTranslations('Catalogue')
	return (
		<main aria-busy="true">
			<div aria-hidden="true" className="bg-brand px-gutter pb-section pt-[clamp(1.5rem,1rem+2vw,2.5rem)]">
				<div className="mx-auto flex max-w-content flex-col items-center gap-6">
					<div className={cn('bg-on-brand/10 motion-safe:animate-pulse', variant === 'detail' ? 'aspect-square w-[clamp(10rem,6rem+18vw,24rem)] rounded-pill' : 'aspect-[1440/400] w-full rounded-control')} />
					<div className="h-9 w-1/2 max-w-sm rounded-control bg-on-brand/10" />
					<div className="h-16 w-full max-w-3xl rounded-control bg-on-brand/10" />
				</div>
			</div>
			{variant === 'listing' ? (
				<div className="bg-surface-soft px-gutter py-section">
					<div className="mx-auto max-w-content">
						<CatalogueGridSkeleton kind={kind} label={t(`${kind}.loading`)} />
					</div>
				</div>
			) : (
				<p className="sr-only" role="status">{t(`${kind}.loading`)}</p>
			)}
		</main>
	)
}

export function CatalogueGridSkeleton({ kind, label }: { kind: PublicCatalogueKind; label: string }) {
	return (
		<div role="status">
			<span className="sr-only">{label}</span>
			<ul aria-hidden="true" className={catalogueGridClass}>
				{Array.from({ length: 6 }, (_, index) => (
					<li className={cn('grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:block', catalogueItemClass)} key={index}>
						<span className={cn('block aspect-square bg-tp-mist/60 motion-safe:animate-pulse', kind === 'service' && 'lg:rounded-pill')} />
						<span className="block aspect-square bg-tp-mist/40 lg:hidden" />
					</li>
				))}
			</ul>
		</div>
	)
}
