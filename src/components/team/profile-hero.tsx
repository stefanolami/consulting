import Image from 'next/image'

import type { TeamProfile } from '@/lib/public-team'

import { ProfileRichText } from './profile-document'

// Navy profile header (Figma 5408:536): name, roles and introduction on the
// left, portrait-format photo on the right. There is no mobile profile design;
// on narrow screens the photo sits between the roles and the introduction.
// Profiles without a portrait (5494:162) use the full width for text.
export function ProfileHero({ portraitAlt, profile }: { portraitAlt: string; profile: TeamProfile }) {
	const { portrait } = profile
	return (
		<header className="bg-brand text-on-brand">
			<div
				className={
					portrait
						? 'mx-auto grid max-w-content gap-x-[clamp(2rem,1rem+4vw,6rem)] gap-y-8 px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)] [grid-template-areas:"name""portrait""intro"] md:grid-cols-[minmax(0,1fr)_minmax(13rem,23rem)] md:[grid-template-areas:"name_portrait""intro_portrait"] md:grid-rows-[auto_1fr]'
						: 'mx-auto grid max-w-content gap-y-8 px-gutter py-[clamp(2.5rem,1.5rem+4vw,6rem)] [grid-template-areas:"name""intro"]'
				}
			>
				<div className="min-w-0 [grid-area:name]">
					<h1 className="break-words font-display text-display font-bold uppercase leading-[0.9] text-tp-silver [hyphens:auto]">{profile.name}</h1>
					{profile.roles.length ? (
						<ul className="mt-6 space-y-1 font-label text-body-lg italic">
							{profile.roles.map((role, index) => <li key={index}>{role}</li>)}
						</ul>
					) : null}
				</div>
				{portrait ? (
					<div className="relative aspect-[3/4] w-full max-w-[18rem] self-start justify-self-center bg-tp-blue-muted [grid-area:portrait] md:max-w-none md:justify-self-stretch">
						<Image alt={portraitAlt} className="object-cover object-top" fill priority sizes="(min-width: 48rem) 23rem, 18rem" src={portrait.url} />
					</div>
				) : null}
				<ProfileRichText className="min-w-0 max-w-[48rem] [grid-area:intro]" content={profile.document.intro.content} />
			</div>
		</header>
	)
}
