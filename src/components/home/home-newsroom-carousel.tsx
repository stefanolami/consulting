'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

// A horizontal swipe longer than this (and more horizontal than vertical)
// changes the slide on touch screens.
const SWIPE_PX = 40

const subscribeNothing = () => () => {}

// Arrows sit over the picture's sides on phones, beside the card from `md`
// (Figma 5652:40) and at the picture's bottom right from `lg` (5412:853). The
// layer takes the picture's shape, so the arrows centre on it without measuring.
const controlsClass = 'pointer-events-none absolute inset-x-0 top-0 flex aspect-[4/5] items-center justify-between px-2 sm:aspect-[4/3] md:px-0 lg:inset-0 lg:aspect-auto lg:items-end lg:justify-end lg:gap-5 lg:p-[1.5625rem]'
// PLACEHOLDER: Lucide arrows stand in for the Figma round arrow artwork
// (docs/figma-asset-needs.md). The white fill keeps them visible on any photo;
// the white halo inside the focus outline does the same for the focus ring.
const arrowClass = 'pointer-events-auto grid size-11 place-items-center rounded-full border-2 border-tp-blue-muted bg-white text-tp-blue-muted shadow-md transition-colors hover:bg-tp-mist focus-visible:shadow-[0_0_0_2px_white] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none'

type Slide = { content: ReactNode; id: string }

type HomeNewsroomCarouselProps = {
	className?: string
	/** ID of the section heading that names the carousel. */
	labelledBy: string
	slides: Slide[]
}

// Homepage news scroll. The server renders every slide; the first one shows
// and the rest wait off-canvas, `inert`, so only the visible slide's link is
// focusable. Previous and next wrap around and never advance on their own. The
// buttons render only after hydration (they do nothing without JavaScript) and
// only with two or more slides. A polite live region announces the position
// after the first change; the slide transition runs only when motion is allowed.
export function HomeNewsroomCarousel({ className, labelledBy, slides }: HomeNewsroomCarouselProps) {
	const t = useTranslations('HomePage.newsroom')
	const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false)
	const [{ current, moved }, setPosition] = useState({ current: 0, moved: false })
	const touchStart = useRef<{ x: number; y: number } | null>(null)
	const total = slides.length
	const go = (step: number) => setPosition((position) => ({ current: (position.current + step + total) % total, moved: true }))

	return (
		<div aria-labelledby={labelledBy} aria-roledescription={t('carousel')} className={className} role="group">
			<div
				className="touch-pan-y overflow-hidden"
				onTouchEnd={(event) => {
					const start = touchStart.current
					touchStart.current = null
					const touch = event.changedTouches[0]
					if (!start || !touch || total < 2) return
					const dx = touch.clientX - start.x
					if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(touch.clientY - start.y)) go(dx < 0 ? 1 : -1)
				}}
				onTouchStart={(event) => {
					const touch = event.touches[0]
					touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
				}}
			>
				<div className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
					{slides.map((slide, index) => (
						<div
							aria-label={t('slideLabel', { current: index + 1, total })}
							aria-roledescription={t('slide')}
							className="w-full shrink-0"
							inert={index !== current}
							key={slide.id}
							role="group"
						>
							{slide.content}
						</div>
					))}
				</div>
			</div>
			{hydrated && total > 1 ? (
				<div className={controlsClass}>
					<button aria-label={t('previous')} className={cn(arrowClass, 'md:-ml-14 lg:ml-0')} onClick={() => go(-1)} type="button">
						<ArrowLeft aria-hidden="true" className="size-6" data-placeholder-asset="home-newsroom-arrow-previous" strokeWidth={2.5} />
					</button>
					<button aria-label={t('next')} className={cn(arrowClass, 'md:-mr-14 lg:mr-0')} onClick={() => go(1)} type="button">
						<ArrowRight aria-hidden="true" className="size-6" data-placeholder-asset="home-newsroom-arrow-next" strokeWidth={2.5} />
					</button>
				</div>
			) : null}
			<p aria-atomic="true" aria-live="polite" className="sr-only">{moved ? t('status', { current: current + 1, total }) : ''}</p>
		</div>
	)
}
