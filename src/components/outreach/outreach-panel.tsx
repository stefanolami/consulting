'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { KeyboardEvent, RefObject } from 'react'

import { Link } from '@/i18n/navigation'
import type { OutreachOverviewCountry, OutreachOverviewService } from '@/lib/outreach/outreach-overview'
import { cn } from '@/lib/utils'

import { PANEL_AREA_CLASS } from './outreach-layout'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark'

// The country summary (Figma 5741:156): a labelled section, not a dialog. It
// floats over the map from `lg` and follows the map below that. Escape and the
// close button return to the region; the explorer moves focus.
export function OutreachPanel({ country, headingRef, onClose }: { country: OutreachOverviewCountry; headingRef: RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
	const t = useTranslations('Outreach')
	const headingId = `outreach-panel-${country.code}`

	function onKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return
		event.stopPropagation()
		onClose()
	}

	return (
		<section aria-labelledby={headingId} className={PANEL_AREA_CLASS} onKeyDown={onKeyDown}>
			<div className="relative">
				<button
					aria-label={t('closeSummary')}
					className={cn('absolute -top-2 -right-2 grid size-11 cursor-pointer place-items-center rounded-full hover:bg-on-brand/10', focusRing)}
					onClick={onClose}
					type="button"
				>
					<X aria-hidden="true" className="size-6" />
				</button>
				<h2 className="px-10 text-center font-display text-heading-1 font-bold uppercase outline-none wrap-anywhere [hyphens:auto]" id={headingId} ref={headingRef} tabIndex={-1}>
					{country.name}
				</h2>
			</div>
			<CountryImage country={country} />
			{country.summary ? <p className="mt-6 font-label text-body">{country.summary}</p> : null}
			<div className="mt-4 flex justify-end">
				<Link
					aria-label={t('overview.readMoreLabel', { country: country.name })}
					className={cn('inline-flex min-h-8 items-center rounded-[0.375rem] bg-white px-3 font-label text-body font-bold text-tp-teal shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:underline hover:underline-offset-4', focusRing)}
					href={`/our-outreach/${country.slug}`}
				>
					{t('overview.readMore')}
				</Link>
			</div>
			{country.coverageSummary ? (
				<p className="mt-5 border-t border-on-brand/60 pt-4 font-label text-body">
					{t('overview.serviceCoverage')} {country.coverageSummary}
				</p>
			) : null}
			{country.services.length ? (
				<div className="mt-5 border-t border-on-brand/60 pt-4">
					<h3 className="font-label text-body">{t('overview.providedServices')}</h3>
					<ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-3">
						{country.services.map((service) => <li key={service.id}><ServiceBadge service={service} /></li>)}
					</ul>
				</div>
			) : null}
		</section>
	)
}

// The country shape filled with its flag (Figma "romania 1"), generated from
// the topology; CMS outline media replaces it when set (control tower
// §15.12.5). Decorative: the heading names the country.
function CountryImage({ country }: { country: OutreachOverviewCountry }) {
	const frame = 'relative mx-auto mt-4 h-[10.5rem] w-full max-w-[15rem]'
	if (country.outline) {
		return (
			<div aria-hidden="true" className={frame}>
				<Image alt="" className="object-contain" fill sizes="15rem" src={country.outline.url} />
			</div>
		)
	}
	if (country.shape) {
		const [x, y, width, height] = country.shape.viewBox
		const clipId = `outreach-shape-${country.code}`
		return (
			<svg aria-hidden="true" className={cn(frame, 'block overflow-visible')} focusable="false" viewBox={country.shape.viewBox.join(' ')}>
				{country.flag ? (
					<>
						<defs><clipPath id={clipId}><path d={country.shape.d} /></clipPath></defs>
						<image clipPath={`url(#${clipId})`} height={height} href={country.flag.url} preserveAspectRatio="xMidYMid slice" width={width} x={x} y={y} />
						<path className="fill-none stroke-white" d={country.shape.d} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
					</>
				) : (
					// PLACEHOLDER: no flag uploaded for this country (docs/figma-asset-needs.md).
					<path className="fill-tp-mist/25 stroke-white" d={country.shape.d} data-placeholder-asset={`outreach-country-flag-${country.code.toLowerCase()}`} strokeDasharray="4 3" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
				)}
			</svg>
		)
	}
	if (country.flag) {
		return (
			<div aria-hidden="true" className={frame}>
				<Image alt="" className="object-contain" fill sizes="15rem" src={country.flag.url} />
			</div>
		)
	}
	// PLACEHOLDER: neither a drawable shape nor a flag (docs/figma-asset-needs.md).
	return <div aria-hidden="true" className={cn(frame, 'max-w-[10.5rem] rounded-control border-2 border-dashed border-on-brand/40')} data-placeholder-asset={`outreach-country-flag-${country.code.toLowerCase()}`} />
}

// A white service circle (Figma "Artboard … copy" icons) linking to the
// service page: the CMS icon faintly behind the name, or a dashed placeholder.
function ServiceBadge({ service }: { service: OutreachOverviewService }) {
	return (
		<Link className={cn('relative grid aspect-square place-items-center overflow-hidden rounded-full bg-white text-center text-tp-blue hover:underline hover:underline-offset-2', focusRing)} href={`/services/${service.slug}`}>
			{service.icon ? (
				<span aria-hidden="true" className="absolute inset-[12%] opacity-25">
					<Image alt="" className="object-contain" fill sizes="6.5rem" src={service.icon.url} />
				</span>
			) : (
				<span aria-hidden="true" className="absolute inset-[12%] rounded-full border-2 border-dashed border-tp-blue/30" data-placeholder-asset={`service-icon-${service.slug}`} />
			)}
			<span className="relative px-2 font-label text-label leading-tight font-bold wrap-anywhere [hyphens:auto]">{service.name}</span>
		</Link>
	)
}
