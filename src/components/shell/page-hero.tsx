import Image from 'next/image'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type HeroIllustration =
	| { kind: 'image'; src: string; width: number; height: number }
	/** A named asset that is not in the repository yet (docs/figma-asset-needs.md). */
	| { kind: 'placeholder'; name: string; label: string; aspectRatio: string }

type PageHeroProps = {
	children?: ReactNode
	className?: string
	illustration: HeroIllustration
	title: ReactNode
	/** `display` is the homepage statement (Unna); `page` is a section title (Roboto Serif). */
	titleVariant?: 'display' | 'page'
}

// Deep-navy hero with a full-bleed white line illustration above a centred
// heading (Figma 5408:616 homepage, 6393:6 services).
export function PageHero({ children, className, illustration, title, titleVariant = 'page' }: PageHeroProps) {
	return (
		<section className={cn('overflow-hidden bg-brand text-on-brand', className)}>
			<div className="mx-auto max-w-[90rem]">
				{illustration.kind === 'image' ? (
					<Image
						alt=""
						className="h-auto w-full"
						height={illustration.height}
						priority
						sizes="100vw"
						src={illustration.src}
						width={illustration.width}
					/>
				) : (
					<div
						className="mx-gutter mt-6 grid place-items-center rounded-control border-2 border-dashed border-on-brand/40 px-4 text-center font-label text-label text-on-brand/70"
						data-placeholder-asset={illustration.name}
						style={{ aspectRatio: illustration.aspectRatio }}
					>
						<span aria-hidden="true">{illustration.label}</span>
					</div>
				)}
			</div>
			<div className="mx-auto flex max-w-content flex-col items-center gap-6 px-gutter pb-section pt-8 text-center">
				<h1 className={titleVariant === 'display' ? 'font-display font-bold' : 'font-serif text-heading-2 font-bold uppercase'}>{title}</h1>
				{children ? <div className="max-w-[76rem] font-label text-lead font-bold">{children}</div> : null}
			</div>
		</section>
	)
}
