import type { ReactNode } from 'react'

import { CatalogueContactsSkeleton } from '@/components/catalogue/catalogue-contacts'
import { catalogueGridClass, catalogueItemClass } from '@/components/catalogue/catalogue-tile'
import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonSection } from '@/components/loading/skeleton-text'
import { ArticleSummarySectionSkeleton } from '@/components/newsroom/article-summary-card'
import { PageHeroSkeleton } from '@/components/shell/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import type { PublicCatalogueKind } from '@/lib/public-catalogue'
import { cn } from '@/lib/utils'

// Detail page while the record loads: emblem hero, "What we do", contacts and
// related articles, in the finished template's layout.
export function CatalogueDetailSkeleton({ label }: { label: ReactNode }) {
	return (
		<LoadingRegion as="main" label={label}>
			<PageHeroSkeleton illustration="emblem" />
			<div className="mx-auto max-w-content space-y-[clamp(3rem,2.25rem+3vw,5.5rem)] px-gutter py-section">
				<SkeletonSection headingWidth="w-1/4" />
				<CatalogueContactsSkeleton />
				<ArticleSummarySectionSkeleton />
			</div>
		</LoadingRegion>
	)
}

// Index tiles while they stream (shapes only; wrap in a LoadingRegion).
// Services also hold the audience selector row's place.
export function CatalogueGridSkeleton({ kind }: { kind: PublicCatalogueKind }) {
	return (
		<>
			{kind === 'service' ? (
				<div className="mx-auto mb-[clamp(2.5rem,1.75rem+3vw,4.5rem)] flex max-w-[34rem] flex-wrap justify-center gap-x-[clamp(1rem,0.5rem+2vw,2.5rem)] gap-y-4 lg:max-w-none lg:justify-between">
					{['w-[9rem] lg:w-[13.5rem]', 'w-[16rem] lg:w-[27rem]', 'w-[9rem] lg:w-[13.5rem]'].map((width, index) => (
						<Skeleton className={cn('h-[clamp(3rem,2.35rem+1.9vw,4.5rem)] rounded-[1.25rem]', width)} key={index} tone="light" />
					))}
				</div>
			) : null}
			<ul className={catalogueGridClass}>
				{Array.from({ length: 6 }, (_, index) => (
					<li className={cn('grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:block', catalogueItemClass)} key={index}>
						<Skeleton className={cn('aspect-square rounded-none', kind === 'service' && 'lg:rounded-pill')} tone="light" />
						<Skeleton className="aspect-square rounded-none opacity-70 lg:hidden" tone="light" />
					</li>
				))}
			</ul>
		</>
	)
}
