import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { Suspense, type CSSProperties } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedGlobalContent, type PublicEndorsement } from '@/lib/public-global-content'
import { cn } from '@/lib/utils'

import { EndorsementCard, EndorsementCardSkeleton, endorsementCardWidthClass } from './endorsement-card'
import { EndorsementMarquee } from './endorsement-marquee'

// Below this many endorsements the cards cannot fill a scrolling row, so they
// are laid out statically. From TWO_ROWS_FROM they split into two rows that
// scroll in opposite directions (Figma 5651:450, legacy endorsements.jsx).
const MARQUEE_FROM = 3
const TWO_ROWS_FROM = 6
// Each scrolling half repeats its row until it holds at least this many cards
// (about 3,100 px), so the loop never shows a gap on wide screens.
const MIN_CARDS_PER_HALF = 6
const SECONDS_PER_CARD = 9

const sectionClass = 'bg-white py-section'
const headingClass = 'px-gutter text-center font-serif text-heading-2 font-bold uppercase text-tp-blue-muted'
const rowsClass = 'mt-[clamp(1.5rem,1rem+2vw,3rem)] space-y-[var(--marquee-gap)] [--marquee-gap:clamp(1rem,0.75rem+1vw,1.5rem)]'
const staticListClass = 'flex flex-wrap items-stretch justify-center gap-[var(--marquee-gap)] px-gutter'

type EndorsementsProps = { className?: string; locale: AppLocale }

// Reusable endorsements band (Why Us; the homepage will reuse it). The heading
// is static, the cards stream: the skeleton holds the place while they load,
// and when the locale has no published endorsement the whole section,
// heading included, is omitted.
export async function Endorsements({ className, locale }: EndorsementsProps) {
	const t = await getTranslations({ locale, namespace: 'Endorsements' })
	return (
		<Suspense fallback={<LoadingRegion as="section" className={cn(sectionClass, className)} label={t('loading')}><EndorsementsSkeleton /></LoadingRegion>}>
			<EndorsementsContent className={className} locale={locale} />
		</Suspense>
	)
}

async function EndorsementsContent({ className, locale }: EndorsementsProps) {
	await connection()
	const [{ endorsements }, t] = await Promise.all([
		getPublishedGlobalContent(locale),
		getTranslations({ locale, namespace: 'Endorsements' }),
	])
	if (!endorsements.length) return null
	const scrolls = endorsements.length >= MARQUEE_FROM
	return (
		<section aria-labelledby="endorsements-heading" className={cn(sectionClass, className)}>
			<h2 className={headingClass} id="endorsements-heading">{t('title')}</h2>
			<div className={rowsClass}>
				{scrolls ? (
					<EndorsementMarquee labels={{ pause: t('pause'), play: t('play') }}>
						<div className="mt-[var(--marquee-gap)] space-y-[var(--marquee-gap)] overflow-hidden py-1 motion-reduce:overflow-visible">
							{splitRows(endorsements).map((row, index) => <MarqueeRow key={index} reverse={index % 2 === 1} row={row} />)}
						</div>
					</EndorsementMarquee>
				) : (
					<ul className={staticListClass}>
						{endorsements.map((endorsement) => <li className={endorsementCardWidthClass} key={endorsement.id}><EndorsementCard endorsement={endorsement} /></li>)}
					</ul>
				)}
			</div>
		</section>
	)
}

function splitRows(endorsements: PublicEndorsement[]) {
	if (endorsements.length < TWO_ROWS_FROM) return [endorsements]
	// Contiguous halves keep the editorial order for assistive technology.
	const middle = Math.ceil(endorsements.length / 2)
	return [endorsements.slice(0, middle), endorsements.slice(middle)]
}

// One scrolling row. The track holds two identical halves and moves by half
// its width, so the loop is seamless; spacing is padding on each item (not
// `gap`) so both halves have exactly the same width. Only the first copy of
// each card is exposed to assistive technology. Without motion the copies are
// removed and the original cards wrap, centred, like the static list.
function MarqueeRow({ reverse, row }: { reverse: boolean; row: PublicEndorsement[] }) {
	const repeats = Math.ceil(MIN_CARDS_PER_HALF / row.length)
	const half = Array.from({ length: repeats }, () => row).flat()
	const style = { '--marquee-duration': `${half.length * SECONDS_PER_CARD}s` } as CSSProperties
	return (
		<ul
			className={cn(
				'flex w-max items-stretch group-hover/marquee:[--marquee-state:paused] group-data-[paused=true]/marquee:[--marquee-state:paused]',
				reverse ? 'motion-safe:animate-marquee-reverse' : 'motion-safe:animate-marquee',
				'motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-[var(--marquee-gap)] motion-reduce:px-gutter',
			)}
			style={style}
		>
			{[0, 1].flatMap((copy) => half.map((endorsement, index) => {
				const original = copy === 0 && index < row.length
				return (
					<li
						aria-hidden={original ? undefined : true}
						className={cn('shrink-0 pr-[var(--marquee-gap)] motion-reduce:pr-0', endorsementCardWidthClass, 'box-content', !original && 'motion-reduce:hidden')}
						key={`${copy}-${index}`}
					>
						<EndorsementCard endorsement={endorsement} />
					</li>
				)
			}))}
		</ul>
	)
}

// Loading shape: heading and a row of cards, clipped at the page edge on
// narrow screens as the scrolling row is.
export function EndorsementsSkeleton() {
	return (
		<>
			<SkeletonText className={cn(headingClass, 'mx-auto w-[min(20rem,70%)] [&>span]:justify-center')} lastLineWidth="w-full" />
			<div className={cn(rowsClass, 'overflow-hidden')}>
				<ul className="flex justify-center gap-[var(--marquee-gap)] px-gutter">
					{Array.from({ length: 3 }, (_, index) => <li className={cn('shrink-0', endorsementCardWidthClass)} key={index}><EndorsementCardSkeleton /></li>)}
				</ul>
			</div>
		</>
	)
}
