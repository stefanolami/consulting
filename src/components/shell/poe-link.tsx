import Image from 'next/image'

import { cn } from '@/lib/utils'

type PoeLinkProps = {
	className?: string
	/** Sizes the graphic; by default it fills the link's height. */
	imageClassName?: string
	externalHint: string
	href: string
	/** Alt text of the graphic, which names the link. */
	label: string
}

// POE is a separate platform on another domain (control tower §21). The
// graphic is the production header artwork (main: public/poe-highlight.png),
// white "POE" on a teal glow over a transparent background, so it is drawn on
// the navy header only.
export function PoeLink({ className, imageClassName, externalHint, href, label }: PoeLinkProps) {
	return (
		<a className={cn('flex items-center', className)} href={href} rel="noopener" target="_blank">
			<Image alt={label} className={cn('h-full w-auto', imageClassName)} height={300} sizes="8rem" src="/brand/poe-highlight.png" width={400} />
			<span className="sr-only"> ({externalHint})</span>
		</a>
	)
}
