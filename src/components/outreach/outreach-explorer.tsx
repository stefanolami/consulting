'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useEffectEvent, useMemo, useRef, useState, type MouseEvent } from 'react'

import type { OutreachOverview, OutreachOverviewRegion } from '@/lib/outreach/outreach-overview'
import {
	closeCountryView,
	countryView,
	outreachSearch,
	parseOutreachParams,
	regionToggleView,
	resolveOutreachView,
	sameView,
	type OutreachView,
} from '@/lib/outreach/outreach-state.mjs'
import { cn } from '@/lib/utils'

import {
	BAND_CLASS,
	INSTRUCTIONS_CLASS,
	MAP_AREA_CLASS,
	NAV_AREA_CLASS,
	REGION_LINK_CLASS,
	TITLE_AREA_CLASS,
	TITLE_CLASS,
} from './outreach-layout'
import { MapSkeleton } from './outreach-map-skeleton'
import { OutreachPanel } from './outreach-panel'

const OutreachMap = dynamic(() => import('./outreach-map'), { loading: () => <MapSkeleton />, ssr: false })

type FocusIntent = { target: 'country'; code: string } | { target: 'panel' } | { target: 'stay' }

const focusRing = 'rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark'
const countryLinkId = (code: string) => `outreach-country-${code}`
const countryListId = (key: string) => `outreach-region-${key}`

// The Our Outreach overview (Figma 5741:2 world, 5741:51 region, 5741:100
// country, 5741:156 summary; control tower §15.12). The URL is the state:
// `?region=<key>` or `?country=<ISO>`, changed with history.pushState so
// selection needs no server request and back/forward replay it. Regions and
// countries are real links, so they also work without JavaScript and when
// opened in a new tab. The region list is the selection surface for keyboard
// and screen-reader users; the map mirrors it for pointers.
export function OutreachExplorer({ overview }: { overview: OutreachOverview }) {
	const t = useTranslations('Outreach')
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const view = resolveOutreachView(parseOutreachParams(searchParams), overview.regions)
	const countriesByCode = useMemo(() => new Map(overview.countries.map((country) => [country.code, country])), [overview.countries])
	const selected = view.country ? countriesByCode.get(view.country) ?? null : null

	const panelHeadingRef = useRef<HTMLHeadingElement>(null)
	const focusIntent = useRef<FocusIntent | null>(null)
	const [announcement, setAnnouncement] = useState('')

	const regionName = (region: OutreachOverviewRegion) => region.name ?? t('overview.otherRegion')
	const describe = (next: OutreachView, previous: OutreachView) => {
		if (next.country) return t('overview.countryAnnouncement', { country: countriesByCode.get(next.country)?.name ?? next.country })
		if (previous.country && next.region === previous.region) return t('overview.closedAnnouncement')
		const region = overview.regions.find((entry) => entry.key === next.region)
		return region ? t('overview.regionAnnouncement', { count: region.countryCodes.length, region: regionName(region) }) : t('overview.worldAnnouncement')
	}

	// Back and forward change the view without moving focus; announce it.
	// Subscribed once: Next.js handles popstate first and may re-render
	// synchronously, which would detach a listener re-subscribed per render.
	const onPopState = useEffectEvent(() => {
		const next = resolveOutreachView(parseOutreachParams(new URLSearchParams(window.location.search)), overview.regions)
		setAnnouncement(describe(next, view))
	})
	useEffect(() => {
		const listener = () => onPopState()
		window.addEventListener('popstate', listener)
		return () => window.removeEventListener('popstate', listener)
	}, [])

	// Focus follows the user's own selections once the new view has rendered.
	const viewKey = `${view.region}:${view.country}`
	useEffect(() => {
		const intent = focusIntent.current
		focusIntent.current = null
		if (intent?.target === 'panel') focusInView(panelHeadingRef.current)
		if (intent?.target === 'country') focusInView(document.getElementById(countryLinkId(intent.code)))
	}, [viewKey])

	const href = (next: OutreachView) => `${pathname}${outreachSearch(next)}`

	function navigate(next: OutreachView, intent: FocusIntent) {
		if (sameView(next, view)) {
			if (intent.target === 'panel') focusInView(panelHeadingRef.current)
			return
		}
		focusIntent.current = intent
		// The focused heading announces an opened summary; everything else is announced here.
		setAnnouncement(intent.target === 'panel' ? '' : describe(next, view))
		window.history.pushState(null, '', href(next))
	}

	// Plain clicks navigate in place; modified clicks keep the browser's behaviour.
	const follow = (next: OutreachView, intent: FocusIntent) => (event: MouseEvent<HTMLAnchorElement>) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
		event.preventDefault()
		navigate(next, intent)
	}

	const selectCountry = (code: string) => {
		const country = countriesByCode.get(code)
		if (country) navigate(countryView(country.regionKey, code), { target: 'panel' })
	}

	return (
		<div className={BAND_CLASS}>
			<div className={TITLE_AREA_CLASS}>
				<h1 className={TITLE_CLASS}>{t('title')}</h1>
				<p className={INSTRUCTIONS_CLASS}>{overview.countries.length ? t('overview.instructions') : t('emptyDescription')}</p>
			</div>
			<div className={MAP_AREA_CLASS}>
				<OutreachMap countries={overview.countries} errorMessage={t('mapError')} hint={t('overview.mapHint')} onSelect={selectCountry} recenterLabel={t('overview.recenterMap')} regions={overview.regions} view={view} />
				{overview.countries.length ? <MapLegend /> : null}
			</div>
			{selected ? <OutreachPanel country={selected} headingRef={panelHeadingRef} key={selected.code} onClose={() => navigate(closeCountryView(view), { code: selected.code, target: 'country' })} /> : null}
			<nav aria-label={t('overview.regionsLabel')} className={NAV_AREA_CLASS}>
				<ul className="space-y-1">
					{overview.regions.map((region) => {
						const open = view.region === region.key
						return (
							<li key={region.key}>
								<a
									aria-controls={countryListId(region.key)}
									aria-expanded={open}
									className={cn(
										REGION_LINK_CLASS,
										focusRing,
										'block py-1.5 text-tp-stone hover:underline hover:underline-offset-4',
										open && '-ml-4 border-l-4 border-tp-azure pl-3 text-on-brand',
									)}
									href={href(regionToggleView(view, region.key))}
									onClick={follow(regionToggleView(view, region.key), { target: 'stay' })}
								>
									{regionName(region)}
								</a>
								<ul className="mt-1 mb-3 ml-[1.7rem] list-disc space-y-0.5 marker:text-on-brand" hidden={!open} id={countryListId(region.key)}>
									{region.countryCodes.map((code) => {
										const country = countriesByCode.get(code)
										if (!country) return null
										const current = code === view.country
										return (
											<li className={cn(current && 'marker:text-tp-azure')} key={code}>
												<a
													aria-current={current ? 'true' : undefined}
													className={cn(focusRing, 'block w-fit py-0.5 font-label text-[1.125rem] leading-[1.3] font-bold text-on-brand hover:underline hover:underline-offset-4', current && 'underline decoration-tp-azure decoration-[3px] underline-offset-4')}
													href={href(countryView(region.key, code))}
													id={countryLinkId(code)}
													onClick={follow(countryView(region.key, code), { target: 'panel' })}
												>
													{country.name}
												</a>
											</li>
										)
									})}
								</ul>
							</li>
						)
					})}
				</ul>
			</nav>
			<p aria-live="polite" className="sr-only" role="status">{announcement}</p>
		</div>
	)
}

// Moves focus without the browser's jump, scrolling only when the element is
// out of view (the summary below the map on narrow screens).
function focusInView(element: HTMLElement | null) {
	if (!element) return
	element.focus({ preventScroll: true })
	element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' })
}

// Explains the map's fills; the colours also differ in lightness and the
// selected country has an outline and a ring (control tower §15.12.3).
function MapLegend() {
	const t = useTranslations('Outreach.overview')
	return (
		<ul aria-label={t('legendLabel')} className="absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-control bg-white/90 px-3 py-2 font-label text-label text-tp-navy">
			<li className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-[2px] bg-tp-blue-muted" />{t('legendCovered')}</li>
			<li className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-[2px] bg-tp-navy outline-2 outline-offset-[-3px] outline-white ring-2 ring-tp-azure" />{t('legendSelected')}</li>
		</ul>
	)
}
