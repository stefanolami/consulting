import Image from 'next/image'

import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import type { TeamProfile } from '@/lib/public-team'
import { cn } from '@/lib/utils'

import { ProfileRichText } from './profile-document'

const withPortraitClass = 'mx-auto grid max-w-content gap-x-[clamp(2rem,1rem+4vw,6rem)] gap-y-8 px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)] [grid-template-areas:"name""portrait""intro"] md:grid-cols-[minmax(0,1fr)_minmax(13rem,23rem)] md:[grid-template-areas:"name_portrait""intro_portrait"] md:grid-rows-[auto_1fr]'
const textOnlyClass = 'mx-auto grid max-w-content gap-y-8 px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)] [grid-template-areas:"name""intro"]'
const nameClass = 'break-words font-display text-display font-bold uppercase leading-[0.9] [hyphens:auto]'
const rolesClass = 'mt-6 space-y-1 font-label text-body-lg italic'
const portraitClass = 'relative aspect-[3/4] w-full max-w-[18rem] self-start justify-self-center [grid-area:portrait] md:max-w-none md:justify-self-stretch'
const introClass = 'min-w-0 max-w-[48rem] [grid-area:intro]'

// Navy profile header (Figma 5408:536): name, roles and introduction on the
// left, portrait-format photo on the right. There is no mobile profile design;
// on narrow screens the photo sits between the roles and the introduction.
// Profiles without a portrait (5494:162) use the full width for text.
export function ProfileHero({ portraitAlt, profile }: { portraitAlt: string; profile: TeamProfile }) {
	const { portrait } = profile
	return (
		<header className="bg-brand text-on-brand">
			<div className={portrait ? withPortraitClass : textOnlyClass}>
				<div className="min-w-0 [grid-area:name]">
					<h1 className={cn(nameClass, 'text-tp-silver')}>{profile.name}</h1>
					{profile.roles.length ? (
						<ul className={rolesClass}>
							{profile.roles.map((role, index) => <li key={index}>{role}</li>)}
						</ul>
					) : null}
				</div>
				{portrait ? (
					<div className={cn(portraitClass, 'bg-tp-blue-muted')}>
						<Image alt={portraitAlt} className="object-cover object-top" fill priority sizes="(min-width: 48rem) 23rem, 18rem" src={portrait.url} />
					</div>
				) : null}
				<ProfileRichText className={introClass} content={profile.document.intro.content} />
			</div>
		</header>
	)
}

// Loading shape of the header, assuming a portrait (most profiles have one).
export function ProfileHeroSkeleton() {
	return (
		<header className="bg-brand">
			<div className={withPortraitClass}>
				<div className="min-w-0 [grid-area:name]">
					<SkeletonText className={nameClass} lastLineWidth="w-4/5" tone="brand" />
					<SkeletonText className={rolesClass} lastLineWidth="w-1/2" lines={2} tone="brand" />
				</div>
				<Skeleton className={cn(portraitClass, 'rounded-none')} tone="brand" />
				<SkeletonText className={cn(introClass, 'font-label text-body-lg')} lines={5} tone="brand" />
			</div>
		</header>
	)
}
