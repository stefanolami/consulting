import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { TeamCard as TeamCardData } from '@/lib/public-team'
import { TEAM_SEGMENT } from '@/lib/team-paths'

import { TeamPortrait } from './team-portrait'

// Team grid card (Figma 5408:15): circular portrait, name, card role. The whole
// card is one link; the portrait is decorative because the name follows it.
export function TeamCard({ card, locale }: { card: TeamCardData; locale: AppLocale }) {
	return (
		<Link
			className="group flex h-full flex-col items-center rounded-panel px-1 pb-2 pt-3 text-center text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
			href={`/${TEAM_SEGMENT}/${card.slug}`}
			locale={locale}
		>
			<TeamPortrait alt="" className="w-[74%] max-w-[16.5rem]" name={card.name} portrait={card.portrait} sizes="(min-width: 64rem) 17rem, 36vw" />
			<span className="mt-[clamp(1rem,0.7rem+1vw,1.75rem)] block max-w-full text-balance break-words font-label text-[clamp(1.0625rem,0.8rem+1.05vw,1.75rem)] font-bold uppercase leading-[1.2] underline-offset-4 group-hover:underline">
				{card.name}
			</span>
			{card.role ? <span className="mt-2 block max-w-full text-balance break-words font-label text-[clamp(0.75rem,0.66rem+0.4vw,1.125rem)] uppercase leading-snug">{card.role}</span> : null}
		</Link>
	)
}
