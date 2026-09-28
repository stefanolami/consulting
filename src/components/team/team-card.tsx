import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { TeamCard as TeamCardData } from '@/lib/public-team'
import { TEAM_SEGMENT } from '@/lib/team-paths'

import { TeamPortrait } from './team-portrait'

// Fixed-width columns centred with flex-wrap reproduce the Figma rows: the
// managing team as a row of two, then rows of three with the last row centred.
// Mobile is two columns throughout.
export const teamGridClass = 'flex flex-wrap justify-center gap-x-[var(--team-gap)] gap-y-[clamp(2rem,1.5rem+2vw,3.5rem)] [--team-gap:clamp(0.75rem,0.2rem+2.4vw,4rem)]'
export const teamItemClass = 'w-[calc((100%-var(--team-gap))/2)] lg:w-[calc((100%-2*var(--team-gap))/3)]'

const cardClass = 'flex h-full flex-col items-center rounded-panel px-1 pb-2 pt-3 text-center'
const portraitClass = 'w-[74%] max-w-[16.5rem]'
const nameClass = 'mt-[clamp(1rem,0.7rem+1vw,1.75rem)] block max-w-full text-balance break-words font-label text-[clamp(1.0625rem,0.8rem+1.05vw,1.75rem)] font-bold uppercase leading-[1.2]'
const roleClass = 'mt-2 block max-w-full text-balance break-words font-label text-[clamp(0.75rem,0.66rem+0.4vw,1.125rem)] uppercase leading-snug'

// Team grid card (Figma 5408:15): circular portrait, name, card role. The whole
// card is one link; the portrait is decorative because the name follows it.
export function TeamCard({ card, locale }: { card: TeamCardData; locale: AppLocale }) {
	return (
		<Link
			className={`group ${cardClass} text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus`}
			href={`/${TEAM_SEGMENT}/${card.slug}`}
			locale={locale}
		>
			<TeamPortrait alt="" className={portraitClass} name={card.name} portrait={card.portrait} sizes="(min-width: 64rem) 17rem, 36vw" />
			<span className={`${nameClass} underline-offset-4 group-hover:underline`}>
				{card.name}
			</span>
			{card.role ? <span className={roleClass}>{card.role}</span> : null}
		</Link>
	)
}

export function TeamCardSkeleton() {
	return (
		<span className={cardClass}>
			<Skeleton className={`${portraitClass} aspect-square rounded-pill`} tone="light" />
			<SkeletonText className={`${nameClass} w-3/5 [&>span]:justify-center`} lastLineWidth="w-full" />
			<SkeletonText className={`${roleClass} w-2/5 [&>span]:justify-center`} lastLineWidth="w-full" />
		</span>
	)
}

// The listing grid while it streams: a row of two (managing team), then three.
export function TeamGridSkeleton() {
	return (
		<div className="space-y-[clamp(2rem,1.5rem+2vw,3.5rem)]">
			{[2, 3].map((count) => (
				<ul className={teamGridClass} key={count}>
					{Array.from({ length: count }, (_, index) => <li className={teamItemClass} key={index}><TeamCardSkeleton /></li>)}
				</ul>
			))}
		</div>
	)
}
