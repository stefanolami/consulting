import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'

import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type HeroIllustration =
	| { kind: 'image'; src: string; width: number; height: number }
	/** A named asset that is not in the repository yet (docs/figma-asset-needs.md). */
	| { kind: 'placeholder'; name: string; label: string; aspectRatio: string }
	/** A centred square illustration, such as a CMS service or sector icon (Figma 5488:464). */
	| { kind: 'emblem'; src: string }
	/** A centred square placeholder for a missing emblem. */
	| { kind: 'emblem-placeholder'; name: string; label: string }

type PageHeroProps = {
	children?: ReactNode
	className?: string
	illustration: HeroIllustration
	title: ReactNode
	/** `display` is the homepage statement (Unna); `page` is a section title (Roboto Serif). */
	titleVariant?: 'display' | 'page'
}

const emblemClass = 'relative mx-auto mt-[clamp(1.5rem,1rem+2vw,2.5rem)] aspect-square w-[clamp(10rem,6rem+18vw,24rem)]'
const bodyClass = 'mx-auto flex max-w-content flex-col items-center gap-6 px-gutter pb-section pt-8 text-center'
const pageTitleClass = 'max-w-full font-serif text-heading-2 font-bold uppercase wrap-anywhere [hyphens:auto]'
const introClass = 'max-w-[76rem] font-label text-lead font-bold wrap-anywhere'

// Deep-navy hero with a white line illustration above a centred heading
// (Figma 5408:616 homepage, 6393:6 services, 5488:464 service detail).
export function PageHero({ children, className, illustration, title, titleVariant = 'page' }: PageHeroProps) {
	return (
		<section className={cn('overflow-hidden bg-brand text-on-brand', className)}>
			<div className="mx-auto max-w-[90rem]">
				<HeroArt illustration={illustration} />
			</div>
			<div className={bodyClass}>
				<h1 className={titleVariant === 'display' ? 'font-display font-bold' : pageTitleClass}>{title}</h1>
				{children ? <div className={introClass}>{children}</div> : null}
			</div>
		</section>
	)
}

// Loading shape of a page-variant hero whose title and intro come from the
// CMS (detail pages). Heroes with static titles render the real PageHero.
export function PageHeroSkeleton({ illustration, introLines = 2 }: { illustration: 'emblem' | { aspectRatio: string }; introLines?: number }) {
	return (
		<section className="overflow-hidden bg-brand">
			<div className="mx-auto max-w-[90rem]">
				{illustration === 'emblem'
					? <Skeleton className={emblemClass} tone="brand" />
					: <Skeleton className="mx-gutter mt-6" style={{ aspectRatio: illustration.aspectRatio }} tone="brand" />}
			</div>
			<div className={bodyClass}>
				<SkeletonText className={cn(pageTitleClass, 'w-[min(28rem,80%)]')} lastLineWidth="w-full" tone="brand" />
				{introLines ? <SkeletonText className={cn(introClass, 'w-full max-w-3xl [&>span]:justify-center')} lastLineWidth="w-2/3" lines={introLines} tone="brand" /> : null}
			</div>
		</section>
	)
}

function HeroArt({ illustration }: { illustration: HeroIllustration }) {
	switch (illustration.kind) {
		case 'image':
			return (
				<Image
					alt=""
					className="h-auto w-full"
					height={illustration.height}
					priority
					sizes="100vw"
					src={illustration.src}
					width={illustration.width}
				/>
			)
		case 'emblem':
			return (
				<div className={emblemClass}>
					<Image alt="" className="object-contain" fill priority sizes="(min-width: 90rem) 24rem, 40vw" src={illustration.src} />
				</div>
			)
		case 'emblem-placeholder':
			return <Placeholder className={emblemClass} label={illustration.label} name={illustration.name} />
		case 'placeholder':
			return <Placeholder className="mx-gutter mt-6" label={illustration.label} name={illustration.name} style={{ aspectRatio: illustration.aspectRatio }} />
	}
}

function Placeholder({ className, label, name, style }: { className: string; label: string; name: string; style?: CSSProperties }) {
	return (
		<div
			className={cn('grid place-items-center rounded-control border-2 border-dashed border-on-brand/40 px-4 text-center font-label text-label text-on-brand/70', className)}
			data-placeholder-asset={name}
			style={style}
		>
			<span aria-hidden="true">{label}</span>
		</div>
	)
}
