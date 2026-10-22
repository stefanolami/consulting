import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import type { OutreachMedia } from '@/lib/public-outreach'
import { cn } from '@/lib/utils'

type ServiceBadgeService = { icon: OutreachMedia | null; name: string; slug: string }

const TONES = {
	// White on the blue summary panel (Figma 5741:156).
	light: { circle: 'bg-white text-tp-blue', focus: 'focus-visible:outline-focus-on-dark', placeholder: 'border-tp-blue/30' },
	// Blue on the white country page (Figma 5741:293).
	brand: { circle: 'bg-tp-blue text-on-brand', focus: 'focus-visible:outline-focus', placeholder: 'border-on-brand/30' },
} as const

// A service circle (Figma "Sercices Icon" artwork) linking to the service
// page: the CMS icon faintly behind the name, or a dashed placeholder.
export function ServiceBadge({ service, tone }: { service: ServiceBadgeService; tone: keyof typeof TONES }) {
	const colours = TONES[tone]
	return (
		<Link
			className={cn('relative grid aspect-square place-items-center overflow-hidden rounded-full text-center hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2', colours.circle, colours.focus)}
			href={`/services/${service.slug}`}
		>
			{service.icon ? (
				<span aria-hidden="true" className="absolute inset-[12%] opacity-25">
					<Image alt="" className="object-contain" fill sizes="7rem" src={service.icon.url} />
				</span>
			) : (
				// PLACEHOLDER: no icon uploaded for this service (docs/figma-asset-needs.md).
				<span aria-hidden="true" className={cn('absolute inset-[12%] rounded-full border-2 border-dashed', colours.placeholder)} data-placeholder-asset={`service-icon-${service.slug}`} />
			)}
			<span className="relative px-2 font-label text-label leading-tight font-bold wrap-anywhere [hyphens:auto]">{service.name}</span>
		</Link>
	)
}
