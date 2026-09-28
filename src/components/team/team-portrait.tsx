import Image from 'next/image'

import type { TeamPortrait as TeamPortraitData } from '@/lib/public-team'
import { cn } from '@/lib/utils'

type TeamPortraitProps = {
	/** Pass an empty string when the name is already announced next to the portrait. */
	alt: string
	className?: string
	name: string
	portrait: TeamPortraitData | null
	sizes: string
}

// Circular portrait framed by an outline ring (Figma team grid 5408:15,
// 5651:258). The photo runs under the ring (inset by half the --ring width,
// ring painted on top), so no gap shows even when the browser rounds the
// border to whole pixels. The ring is drawn in CSS; the legacy portrait
// photos are portrait-format, so the crop favours the upper part.
export function TeamPortrait({ alt, className, name, portrait, sizes }: TeamPortraitProps) {
	return (
		<span className={cn('relative block aspect-square [--ring:clamp(0.1875rem,0.15rem+0.2vw,0.375rem)]', className)}>
			<span aria-hidden="true" className="absolute inset-0 z-10 rounded-pill border-(length:--ring) border-tp-mist transition-colors duration-200 group-hover:border-brand-strong group-focus-visible:border-brand-strong motion-reduce:transition-none" />
			<span className="absolute inset-[calc(var(--ring)/2)] overflow-hidden rounded-pill bg-tp-mist">
				{portrait ? (
					<Image alt={alt} className="object-cover object-[50%_18%]" fill sizes={sizes} src={portrait.url} />
				) : (
					<span aria-hidden={alt ? undefined : true} aria-label={alt || undefined} className="grid size-full place-items-center font-label text-heading-2 font-bold text-brand" role={alt ? 'img' : undefined}>
						{initials(name)}
					</span>
				)}
			</span>
		</span>
	)
}

export function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}
