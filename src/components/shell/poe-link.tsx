import { cn } from '@/lib/utils'

type PoeLinkProps = {
	className?: string
	externalHint: string
	href: string
	label: string
}

// POE is a separate platform on another domain (control tower §21). The glow
// reproduces the Figma "POE" artwork in CSS instead of the legacy raster
// (main: public/poe-highlight.png), so it stays crisp at any size.
export function PoeLink({ className, externalHint, href, label }: PoeLinkProps) {
	return (
		<a
			className={cn(
				'relative isolate inline-flex items-center justify-center font-display font-bold tracking-wide text-on-brand',
				'before:absolute before:inset-0 before:-z-10 before:rounded-pill before:bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_85%,transparent),color-mix(in_srgb,var(--color-glow)_35%,transparent)_55%,transparent)]',
				'[text-shadow:0_0_0.25em_rgb(255_255_255/0.9),0_0_0.6em_var(--color-glow)]',
				className,
			)}
			href={href}
			rel="noopener"
			target="_blank"
		>
			{label}
			<span className="sr-only"> ({externalHint})</span>
		</a>
	)
}
