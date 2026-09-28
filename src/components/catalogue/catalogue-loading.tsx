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
export function CatalogueGridSkeleton({ kind }: { kind: PublicCatalogueKind }) {
	return (
		<ul className={catalogueGridClass}>
			{Array.from({ length: 6 }, (_, index) => (
				<li className={cn('grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:block', catalogueItemClass)} key={index}>
					<Skeleton className={cn('aspect-square rounded-none', kind === 'service' && 'lg:rounded-pill')} tone="light" />
					<Skeleton className="aspect-square rounded-none opacity-70 lg:hidden" tone="light" />
				</li>
			))}
		</ul>
	)
}
