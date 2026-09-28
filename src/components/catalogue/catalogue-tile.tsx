import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { CatalogueCard, PublicCatalogueKind } from '@/lib/public-catalogue'
import { cn } from '@/lib/utils'

export const CATALOGUE_SEGMENT = { sector: 'sectors', service: 'services' } as const

// Three per row from `lg`, the last row centred (Figma 5408:187); one row per
// item below that (Figma mobile). Shared with the loading skeleton.
export const catalogueGridClass = 'mx-auto flex max-w-[34rem] flex-col gap-y-4 lg:max-w-none lg:flex-row lg:flex-wrap lg:justify-center lg:gap-(--tile-gap) lg:[--tile-gap:clamp(1.5rem,0.2rem+2.6vw,3.25rem)]'
export const catalogueItemClass = 'lg:w-[calc((100%-2*var(--tile-gap))/3)]'

type CatalogueTileProps = {
	index: number
	item: CatalogueCard
	kind: PublicCatalogueKind
	locale: AppLocale
}

// One link per service or sector, with two layouts from the same markup:
// - below `lg` (Figma mobile 5651:347 / 5651:406): a row of two square cells,
//   the blue title cell and the navy summary cell, alternating sides per row;
// - from `lg` (Figma 6393:6 / 5408:187): a round (service) or square (sector)
//   tile showing the title; the summary slides up over it on hover and on
//   keyboard focus ("Slide when hovered"), instantly under reduced motion.
// The title names the link and the summary describes it, so screen readers
// get both at every width.
export function CatalogueTile({ index, item, kind, locale }: CatalogueTileProps) {
	const titleId = `${kind}-${item.id}-title`
	const summaryId = `${kind}-${item.id}-summary`
	const round = kind === 'service'
	return (
		<Link
			aria-describedby={item.summary ? summaryId : undefined}
			aria-labelledby={titleId}
			className={cn(
				'group relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] text-on-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
				'lg:block lg:aspect-square lg:overflow-hidden',
				round && 'lg:rounded-pill',
			)}
			href={`/${CATALOGUE_SEGMENT[kind]}/${item.slug}`}
			locale={locale}
		>
			<span
				className={cn(
					// The ::before spacer keeps the cell at least square (half-height when
					// it spans the row) while letting a long summary make the row taller;
					// an aspect-ratio would widen the cell instead.
					'relative grid grid-cols-[minmax(0,1fr)] place-items-center self-stretch overflow-hidden bg-brand-strong text-center',
					"before:col-start-1 before:row-start-1 before:content-['']",
					item.summary ? 'before:pb-[100%]' : 'col-span-2 before:pb-[50%]',
					index % 2 === 1 && item.summary && 'order-2',
					'lg:order-none lg:size-full lg:before:hidden',
				)}
			>
				<TileIcon icon={item.icon} name={`${kind}-icon-${item.slug}`} round={round} />
				<span className={cn('relative col-start-1 row-start-1 mx-[8%] my-6 font-label wrap-anywhere text-[clamp(1.0625rem,0.8rem+1.1vw,1.75rem)] font-bold leading-[1.15] [hyphens:auto] group-hover:underline group-hover:underline-offset-4 lg:group-hover:no-underline', round && 'lg:mx-[14%]')} id={titleId}>
					{item.name}
				</span>
			</span>
			{item.summary ? (
				<span
					className={cn(
						'grid grid-cols-[minmax(0,1fr)] place-items-center self-stretch bg-brand px-[7%] py-4 text-center',
						'lg:invisible lg:absolute lg:inset-0 lg:translate-y-full lg:px-[9%] lg:transition-[translate,visibility] lg:duration-400 lg:ease-in-out lg:group-hover:visible lg:group-hover:translate-y-0 lg:group-focus-visible:visible lg:group-focus-visible:translate-y-0 lg:motion-reduce:transition-none',
						round && 'lg:px-[17%]',
					)}
					id={summaryId}
				>
					<span className="max-w-full font-label wrap-anywhere text-[clamp(0.8125rem,0.72rem+0.35vw,1.0625rem)] font-bold leading-snug [hyphens:auto] lg:line-clamp-8">{item.summary}</span>
				</span>
			) : null}
		</Link>
	)
}

// The faint line icon behind the title. Icons are CMS media; a missing icon
// shows a visible placeholder outline (docs/figma-asset-needs.md).
function TileIcon({ icon, name, round }: { icon: CatalogueCard['icon']; name: string; round: boolean }) {
	if (icon) {
		return (
			<span aria-hidden="true" className="absolute inset-[12%] opacity-25">
				<Image alt="" className="object-contain" fill sizes="(min-width: 64rem) 16rem, 40vw" src={icon.url} />
			</span>
		)
	}
	return <span aria-hidden="true" className={cn('absolute inset-[18%] border-2 border-dashed border-on-brand/35', round ? 'rounded-pill' : 'rounded-control')} data-placeholder-asset={name} />
}
