import type { ReactNode } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonSection } from '@/components/loading/skeleton-text'

import { ProfileHeroSkeleton } from './profile-hero'

// Profile while it loads: navy header with portrait, two body sections and the
// contact block, in the finished template's layout (src/app/[locale]/who-we-are/[slug]).
export function TeamProfileSkeleton({ label }: { label: ReactNode }) {
	return (
		<LoadingRegion as="main" label={label}>
			<ProfileHeroSkeleton />
			<div className="mx-auto max-w-content space-y-[clamp(3rem,2.25rem+3vw,5.5rem)] px-gutter py-section">
				<SkeletonSection headingWidth="w-1/3" />
				<SkeletonSection headingWidth="w-1/4" lines={4} />
				<SkeletonSection headingWidth="w-1/5" lines={2} ruled />
			</div>
		</LoadingRegion>
	)
}
