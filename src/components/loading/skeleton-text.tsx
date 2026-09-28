import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type SkeletonTextProps = {
	/** Pass the same typography classes as the real text so each line box matches its height. */
	className?: string
	lines?: number
	tone?: 'brand' | 'light'
	/** Width of the last line; the others are full width. */
	lastLineWidth?: string
}

// Placeholder lines that take exactly the real text's line height (`1lh`), so
// swapping in the content does not move what follows it.
export function SkeletonText({ className, lastLineWidth = 'w-3/5', lines = 1, tone = 'light' }: SkeletonTextProps) {
	return (
		<span className={cn('block', className)}>
			{Array.from({ length: lines }, (_, index) => (
				<span className="flex h-lh items-center" key={index}>
					<Skeleton className={cn('h-[0.7em]', index === lines - 1 ? lastLineWidth : 'w-full')} tone={tone} />
				</span>
			))}
		</span>
	)
}

// Section heading with the full-width rule used by profile and catalogue
// sections ("Contact", "Get in Touch with the Team", "Articles for …").
export function SkeletonSectionHeading({ width = 'w-2/5' }: { width?: string }) {
	return (
		<div className="border-b-2 border-tp-mist pb-3">
			<SkeletonText className="font-display text-heading-2 font-bold" lastLineWidth={width} />
		</div>
	)
}

// A titled body section: heading (optionally ruled), then paragraph lines in
// the public body typography.
export function SkeletonSection({ bodyClassName = 'font-label text-body-lg', headingWidth, lines = 6, ruled = false }: { bodyClassName?: string; headingWidth?: string; lines?: number; ruled?: boolean }) {
	return (
		<div>
			{ruled ? <SkeletonSectionHeading width={headingWidth} /> : <SkeletonText className="font-display text-heading-2 font-bold" lastLineWidth={headingWidth ?? 'w-2/5'} />}
			<SkeletonText className={cn('mt-[clamp(1.25rem,1rem+1vw,2rem)]', bodyClassName)} lines={lines} lastLineWidth="w-1/2" />
		</div>
	)
}
