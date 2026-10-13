import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'

import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type HeroIllustration =
	| { kind: 'image'; src: string; width: number; height: number }
	/** A named asset that is not in the repository yet (docs/figma-asset-needs.md). */
	| { kind: 'placeholder'; name: string; label: string; width: number; height: number }
	/** A centred square illustration, such as a CMS service or sector icon (Figma 5488:464). */
	| { kind: 'emblem'; src: string }
	/** A centred square placeholder for a missing emblem. */
	| { kind: 'emblem-placeholder'; name: string; label: string }

type PageHeroProps = {
	children?: ReactNode
	className?: string
	/** Omitted on text pages without artwork (legal pages); the title then gets more room above. */
	illustration?: HeroIllustration
	title: ReactNode
	/** `display` is the homepage statement (Unna); `page` is a section title (Roboto Serif). */
	titleVariant?: 'display' | 'page'
}

type DrawingSize = { width: number; height: number }

const emblemClass = 'relative mx-auto mt-[clamp(1.5rem,1rem+2vw,2.5rem)] aspect-square w-[clamp(10rem,6rem+18vw,24rem)]'
const bodyClass = 'mx-auto flex w-full max-w-content flex-col items-center gap-6 px-gutter pb-section text-center'
const pageTitleClass = 'max-w-full font-serif text-heading-2 font-bold uppercase wrap-anywhere [hyphens:auto]'
// Top padding: tight under artwork, a full section without it.
const bodyTopClass = (hasArt: boolean) => (hasArt ? 'pt-8' : 'pt-section')
const introClass = 'max-w-[76rem] font-label text-lead font-bold wrap-anywhere'
// Drawing heroes are at least --page-hero-height tall (the viewport below the
// sticky header, capped; globals.css) and grow when the text needs more.
const drawingHeroClass = 'flex min-h-(--page-hero-height) flex-col'
// The drawing takes the height left above the text and is scaled to fit it
// whole. It never gets shorter than its full-width height, 15rem or 40% of
// the viewport, whichever is smallest, so long intros cannot squeeze it away.
const drawingFrameClass = 'relative mx-auto mt-[clamp(1rem,0.5rem+1.5vw,2rem)] grid place-items-center [container-type:size] min-h-[min(min(100vw,90rem)/var(--hero-art-aspect),15rem,40svh)] w-full max-w-[90rem] flex-1'
// A box of the drawing's proportions, as large as fits the frame (placeholder and skeleton).
const drawingBoxClass = 'aspect-(--hero-art-aspect) w-[min(100cqw,100cqh*var(--hero-art-aspect))]'

const isDrawing = (illustration: HeroIllustration | undefined): illustration is Extract<HeroIllustration, DrawingSize> =>
	illustration?.kind === 'image' || illustration?.kind === 'placeholder'

// Deep-navy hero with a white line illustration above a centred heading
// (Figma 5408:616 homepage, 6393:6 services, 5488:464 service detail).
export function PageHero({ children, className, illustration, title, titleVariant = 'page' }: PageHeroProps) {
	return (
		<section className={cn('overflow-hidden bg-brand text-on-brand', isDrawing(illustration) && drawingHeroClass, className)}>
			{illustration ? <HeroArt illustration={illustration} /> : null}
			<div className={cn(bodyClass, bodyTopClass(Boolean(illustration)))}>
				<h1 className={titleVariant === 'display' ? 'font-display font-bold' : pageTitleClass}>{title}</h1>
				{children ? <div className={introClass}>{children}</div> : null}
			</div>
		</section>
	)
}

// Loading shape of a page-variant hero. Pass the drawing's size for a drawing
// hero so the skeleton takes the same height as the loaded hero.
export function PageHeroSkeleton({ illustration, introLines = 2 }: { illustration: 'emblem' | 'none' | DrawingSize; introLines?: number }) {
	const drawing = typeof illustration === 'object' ? illustration : null
	return (
		<section className={cn('overflow-hidden bg-brand', drawing && drawingHeroClass)}>
			{drawing ? (
				<DrawingFrame size={drawing}>
					<Skeleton className={drawingBoxClass} tone="brand" />
				</DrawingFrame>
			) : illustration === 'emblem' ? (
				<div className="mx-auto max-w-[90rem]">
					<Skeleton className={emblemClass} tone="brand" />
				</div>
			) : null}
			<div className={cn(bodyClass, bodyTopClass(illustration !== 'none'))}>
				<SkeletonText className={cn(pageTitleClass, 'w-[min(28rem,80%)]')} lastLineWidth="w-full" tone="brand" />
				{introLines ? <SkeletonText className={cn(introClass, 'w-full max-w-3xl [&>span]:justify-center')} lastLineWidth="w-2/3" lines={introLines} tone="brand" /> : null}
			</div>
		</section>
	)
}

function DrawingFrame({ children, size }: { children: ReactNode; size: DrawingSize }) {
	return (
		<div className={drawingFrameClass} style={{ '--hero-art-aspect': size.width / size.height } as CSSProperties}>
			{children}
		</div>
	)
}

function HeroArt({ illustration }: { illustration: HeroIllustration }) {
	switch (illustration.kind) {
		case 'image':
			return (
				<DrawingFrame size={illustration}>
					<Image alt="" className="object-contain" fill priority sizes="(min-width: 90rem) 90rem, 100vw" src={illustration.src} />
				</DrawingFrame>
			)
		case 'emblem':
			return (
				<div className="mx-auto max-w-[90rem]">
					<div className={emblemClass}>
						<Image alt="" className="object-contain" fill priority sizes="(min-width: 90rem) 24rem, 40vw" src={illustration.src} />
					</div>
				</div>
			)
		case 'emblem-placeholder':
			return (
				<div className="mx-auto max-w-[90rem]">
					<Placeholder className={emblemClass} label={illustration.label} name={illustration.name} />
				</div>
			)
		case 'placeholder':
			return (
				<DrawingFrame size={illustration}>
					<Placeholder className={drawingBoxClass} label={illustration.label} name={illustration.name} />
				</DrawingFrame>
			)
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
