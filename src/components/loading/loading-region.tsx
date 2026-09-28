import type { ReactNode } from 'react'

type LoadingRegionProps = {
	/** `main` for route-level skeletons, `div` (default) or `section` for streamed sections. */
	as?: 'div' | 'main' | 'section'
	children: ReactNode
	className?: string
	/** Localized text announced once, politely: a string, or `<LoadingMessage>` where no locale is available. */
	label: ReactNode
}

// The one accessible wrapper for every public loading state: the region is
// busy, a single polite status carries the localized label, and everything
// visual inside is hidden from assistive technology. Skeleton shapes nested
// inside must not add their own status.
export function LoadingRegion({ as: Element = 'div', children, className, label }: LoadingRegionProps) {
	return (
		<Element aria-busy="true" className={className}>
			<span className="sr-only" role="status">{label}</span>
			<div aria-hidden="true" className="contents">{children}</div>
		</Element>
	)
}
