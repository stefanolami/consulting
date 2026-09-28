import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// shadcn Skeleton with tones for the public surfaces. `default` keeps the
// shadcn (admin) look; `light` sits on white and soft-blue bands; `brand` sits
// on the navy heroes. Shapes are decorative, and the pulse only runs when
// motion is allowed.
const skeletonVariants = cva('block motion-safe:animate-pulse', {
	variants: {
		tone: {
			default: 'rounded-md bg-accent',
			light: 'rounded-control bg-tp-mist/60',
			brand: 'rounded-control bg-on-brand/10',
		},
	},
	defaultVariants: { tone: 'default' },
})

function Skeleton({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof skeletonVariants>) {
	return (
		<span
			aria-hidden="true"
			data-slot="skeleton"
			className={cn(skeletonVariants({ tone }), className)}
			{...props}
		/>
	)
}

export { Skeleton, skeletonVariants }
