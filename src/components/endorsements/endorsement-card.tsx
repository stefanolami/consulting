import Image from 'next/image'

import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import type { PublicEndorsement } from '@/lib/public-global-content'
import { cn } from '@/lib/utils'

// Fixed card width (legacy 500 px), never wider than the viewport minus the
// page gutters, so a card is always fully readable on a phone.
export const endorsementCardWidthClass = 'w-[min(31.25rem,calc(100vw-2*var(--spacing-gutter)))]'

const cardClass = 'flex h-full flex-col overflow-hidden rounded-[0.5rem] bg-brand text-on-brand ring-1 ring-tp-stone'
const mediaClass = 'relative h-[clamp(8rem,6.5rem+5vw,10rem)] shrink-0 bg-white'
const captionClass = 'order-1 px-[clamp(1.25rem,1rem+1vw,1.75rem)] pt-[clamp(1.25rem,1rem+1vw,1.75rem)]'
const nameClass = 'block font-label text-body-lg font-bold'
const titleClass = 'mt-1 block font-label text-body font-medium'
const quoteClass = 'order-2 px-[clamp(1.25rem,1rem+1vw,1.75rem)] pb-[clamp(1.5rem,1.25rem+1vw,2rem)] pt-4 font-label text-body text-tp-mist'

// One endorsement (Figma 5651:450, legacy endorsements-row): the partner logo
// on white above a navy panel with the name, title and quote. The quote comes
// first in the DOM so assistive technology reads quote, then attribution; the
// attribution is shown above it, as in the design. The logo is the partner's
// public logo; without one the portrait is shown, and without either the
// partner name stands in, so every card keeps the same rhythm.
export function EndorsementCard({ endorsement }: { endorsement: PublicEndorsement }) {
	return (
		<figure className={cardClass}>
			<EndorsementMedia endorsement={endorsement} />
			<blockquote className={quoteClass}>
				<p>“{endorsement.quote}”</p>
			</blockquote>
			<figcaption className={captionClass}>
				<span className={nameClass}>{endorsement.attributionName}</span>
				{endorsement.attributionTitle ? <span className={titleClass}>{endorsement.attributionTitle}</span> : null}
			</figcaption>
		</figure>
	)
}

function EndorsementMedia({ endorsement }: { endorsement: PublicEndorsement }) {
	if (endorsement.logo) {
		return (
			<div className={mediaClass}>
				<Image alt={endorsement.logo.alt} className="object-contain p-[clamp(1rem,0.75rem+1vw,1.75rem)]" fill sizes="(min-width: 34rem) 31.25rem, 90vw" src={endorsement.logo.url} />
			</div>
		)
	}
	if (endorsement.portrait) {
		return (
			<div className={cn(mediaClass, 'grid place-items-center')}>
				<span className="relative aspect-square h-[78%] overflow-hidden rounded-pill ring-2 ring-tp-mist">
					<Image alt={endorsement.portrait.alt} className="object-cover" fill sizes="8rem" src={endorsement.portrait.url} />
				</span>
			</div>
		)
	}
	return (
		<div className={cn(mediaClass, 'grid place-items-center px-6 text-center')}>
			{endorsement.partnerName
				? <span className="font-display text-heading-3 font-bold text-brand">{endorsement.partnerName}</span>
				: <span aria-hidden="true" className="font-display text-[5rem] leading-none text-tp-mist">“</span>}
		</div>
	)
}

export function EndorsementCardSkeleton() {
	return (
		<span className={cn(cardClass, 'ring-tp-mist/60')}>
			<span className={cn(mediaClass, 'block')}><Skeleton className="size-full rounded-none" tone="light" /></span>
			<span className={captionClass}>
				<SkeletonText className={cn(nameClass, 'w-1/2')} lastLineWidth="w-full" tone="brand" />
				<SkeletonText className={cn(titleClass, 'w-4/5')} lastLineWidth="w-full" tone="brand" />
			</span>
			<SkeletonText className={cn(quoteClass, 'block')} lastLineWidth="w-2/3" lines={4} tone="brand" />
		</span>
	)
}
