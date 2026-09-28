import Image from 'next/image'

import { cn } from '@/lib/utils'

// Brand-supplied round icons (copied from the legacy site) for every platform
// the site settings accept (see src/lib/public-global-content.ts).
const PLATFORMS: Record<string, { icon: string; name: string }> = {
	facebook: { icon: '/brand/social/facebook.png', name: 'Facebook' },
	instagram: { icon: '/brand/social/instagram.png', name: 'Instagram' },
	linkedin: { icon: '/brand/social/linkedin.png', name: 'LinkedIn' },
	x: { icon: '/brand/social/x.png', name: 'X' },
	youtube: { icon: '/brand/social/youtube.png', name: 'YouTube' },
}

type SocialLinksProps = {
	className?: string
	externalHint: string
	label: string
	socials: Array<{ platform: string; url: string }>
}

export function SocialLinks({ className, externalHint, label, socials }: SocialLinksProps) {
	const items = socials.flatMap((social) => {
		const platform = PLATFORMS[social.platform]
		return platform ? [{ ...platform, url: social.url }] : []
	})
	if (!items.length) return null

	return (
		<ul aria-label={label} className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
			{items.map((item) => (
				<li key={item.url}>
					<a
						className="block rounded-pill transition-transform duration-200 motion-safe:hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark motion-reduce:transition-none"
						href={item.url}
						rel="noopener noreferrer"
						target="_blank"
					>
						<Image alt={`${item.name} (${externalHint})`} className="size-[2.375rem]" height={38} src={item.icon} width={38} />
					</a>
				</li>
			))}
		</ul>
	)
}
