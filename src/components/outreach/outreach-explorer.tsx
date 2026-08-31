'use client'

import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { numericToAlpha2 } from 'i18n-iso-countries'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'

import type { AppLocale } from '@/i18n/routing'
import { routing } from '@/i18n/routing'
import type { OutreachCountry, OutreachStatistic } from '@/lib/public-outreach'

type ExplorerMessages = {
	backToList: string
	closeSummary: string
	coveredCountry: string
	countryList: string
	detailLink: string
	emptyDescription: string
	emptyTitle: string
	experts: string
	mapError: string
	mapInstructions: string
	mapLabel: string
	mapLoading: string
	offices: string
	region: string
	services: string
	statistics: string
}

type CountryTopology = Topology<{ countries: GeometryCollection }>

export function OutreachExplorer({ countries, locale, messages }: { countries: OutreachCountry[]; locale: AppLocale; messages: ExplorerMessages }) {
	const pathname = usePathname()
	const router = useRouter()
	const searchParams = useSearchParams()
	const listHeadingRef = useRef<HTMLHeadingElement>(null)
	const panelHeadingRef = useRef<HTMLHeadingElement>(null)
	const selectedCode = normalizeCountryCode(searchParams.get('country'))
	const selected = countries.find((country) => country.code === selectedCode) ?? null
	const previousSelection = useRef(selected?.code ?? null)

	useEffect(() => {
		const nextSelection = selected?.code ?? null
		if (previousSelection.current === nextSelection) return
		if (nextSelection) panelHeadingRef.current?.focus()
		else listHeadingRef.current?.focus()
		previousSelection.current = nextSelection
	}, [selected?.code])

	function selectCountry(code: string | null) {
		const next = code ? `${pathname}?country=${encodeURIComponent(code)}` : pathname
		router.push(next, { scroll: false })
	}

	if (!countries.length) {
		return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8" role="status"><h2 className="text-xl font-semibold">{messages.emptyTitle}</h2><p className="mt-2 text-slate-700">{messages.emptyDescription}</p></div>
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
		<div className="min-w-0 space-y-8">
			<OutreachMap countries={countries} messages={messages} onSelect={selectCountry} selectedCode={selected?.code ?? null} />
			<section aria-labelledby="outreach-country-list-heading">
				<h2 className="text-2xl font-semibold outline-none" id="outreach-country-list-heading" ref={listHeadingRef} tabIndex={-1}>{messages.countryList}</h2>
				<ul className="mt-4 grid gap-3 sm:grid-cols-2">
					{countries.map((country) => <li key={country.code}><button aria-pressed={country.code === selected?.code} className="flex w-full items-center justify-between rounded-md border border-slate-300 px-4 py-3 text-left hover:border-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 aria-pressed:border-slate-950 aria-pressed:bg-slate-100" onClick={() => selectCountry(country.code)} type="button"><span>{country.name}</span><span className="font-mono text-xs text-slate-600">{country.code}</span></button></li>)}
				</ul>
			</section>
		</div>
		<aside aria-label={selected?.name ?? messages.coveredCountry} className="rounded-lg border border-slate-300 bg-white p-6 lg:sticky lg:top-6 lg:self-start">
			{selected ? <CountrySummary country={selected} headingRef={panelHeadingRef} locale={locale} messages={messages} onClose={() => selectCountry(null)} /> : <p className="leading-7 text-slate-700">{messages.mapInstructions}</p>}
		</aside>
		</div>
	)
}

function OutreachMap({ countries, messages, onSelect, selectedCode }: { countries: OutreachCountry[]; messages: ExplorerMessages; onSelect: (code: string) => void; selectedCode: string | null }) {
	const [geometry, setGeometry] = useState<FeatureCollection<Geometry> | null>(null)
	const [failed, setFailed] = useState(false)
	const countriesByCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries])

	useEffect(() => {
		const controller = new AbortController()
		async function loadGeometry() {
			try {
				const response = await fetch('/data/world-countries-110m.topo.json', { signal: controller.signal })
				if (!response.ok) throw new Error(`Map request failed with ${response.status}`)
				const topology = await response.json() as CountryTopology
				setGeometry(feature(topology, topology.objects.countries))
			} catch (error) {
				if ((error as { name?: string }).name !== 'AbortError') setFailed(true)
			}
		}
		void loadGeometry()
		return () => controller.abort()
	}, [])

	const paths = useMemo(() => {
		if (!geometry) return []
		const projection = geoNaturalEarth1().fitExtent([[8, 8], [952, 492]], geometry)
		const renderPath = geoPath(projection)
		return geometry.features.map((item, index) => {
			const id = item.id === undefined ? '' : String(item.id).padStart(3, '0')
			const code = numericToAlpha2(id)
			return { code, d: renderPath(item), key: `${id}:${index}` }
		})
	}, [geometry])

	if (failed) return <div className="flex aspect-[1.9/1] items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-6 text-center text-slate-700" role="alert">{messages.mapError}</div>
	if (!geometry) return <div className="flex aspect-[1.9/1] items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-6 text-slate-700" role="status">{messages.mapLoading}</div>

	return (
		<section aria-labelledby="outreach-map-heading">
			<h2 className="sr-only" id="outreach-map-heading">{messages.mapLabel}</h2>
			<p className="mb-3 text-sm text-slate-600">{messages.mapInstructions}</p>
			<svg aria-labelledby="outreach-map-title outreach-map-description" className="h-auto w-full rounded-lg border border-slate-300 bg-slate-50" role="group" viewBox="0 0 960 500">
				<title id="outreach-map-title">{messages.mapLabel}</title>
				<desc id="outreach-map-description">{messages.mapInstructions}</desc>
				{paths.map((path) => {
					const country = path.code ? countriesByCode.get(path.code) : undefined
					const selected = country?.code === selectedCode
					return <path aria-hidden={country ? undefined : true} aria-label={country?.name} aria-pressed={country ? selected : undefined} className={country ? 'cursor-pointer stroke-white focus:outline-none focus-visible:stroke-slate-950 focus-visible:stroke-[2]' : 'pointer-events-none fill-slate-200 stroke-white'} d={path.d ?? undefined} fill={country ? selected ? '#0f172a' : '#64748b' : undefined} key={path.key} onClick={country ? () => onSelect(country.code) : undefined} onKeyDown={country ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(country.code) } } : undefined} role={country ? 'button' : undefined} strokeWidth={0.5} tabIndex={country ? 0 : undefined}>{country ? <title>{country.name} ({country.code})</title> : null}</path>
				})}
			</svg>
		</section>
	)
}

function CountrySummary({ country, headingRef, locale, messages, onClose }: { country: OutreachCountry; headingRef: React.RefObject<HTMLHeadingElement | null>; locale: AppLocale; messages: ExplorerMessages; onClose: () => void }) {
	return <div>
		<div className="flex items-start justify-between gap-4"><div>{country.region ? <p className="text-sm text-slate-600">{messages.region}: {country.region.name}</p> : null}<h2 className="mt-1 text-3xl font-semibold outline-none" ref={headingRef} tabIndex={-1}>{country.name}</h2><p className="mt-1 font-mono text-xs text-slate-500">ISO 3166-1: {country.code}</p></div><button aria-label={messages.closeSummary} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={onClose} type="button">×</button></div>
		{country.flag ? <Image alt={country.flag.alt} className="mt-5 h-auto max-h-24 w-auto border border-slate-200 object-contain" height={96} src={country.flag.url} unoptimized width={160} /> : null}
		{country.summary ? <p className="mt-5 leading-7 text-slate-700">{country.summary}</p> : null}
		{country.coverageSummary ? <p className="mt-3 leading-7 text-slate-700">{country.coverageSummary}</p> : null}
		<SummaryList heading={messages.services} items={country.services.map((service) => service.name)} />
		{country.statistics.length ? <section className="mt-6"><h3 className="font-semibold">{messages.statistics}</h3><dl className="mt-2 space-y-2">{country.statistics.map((statistic) => <div className="flex justify-between gap-4" key={statistic.id}><dt className="text-slate-600">{statistic.label}</dt><dd className="text-right font-medium">{formatStatistic(statistic, locale)}</dd></div>)}</dl></section> : null}
		<SummaryList heading={messages.offices} items={country.offices.map((office) => [office.name, office.city].filter(Boolean).join(', '))} />
		<SummaryList heading={messages.experts} items={country.people.map((person) => [person.name, person.role].filter(Boolean).join(' — '))} />
		<Link className="mt-7 inline-flex rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white" href={outreachPath(locale, country.slug)}>{messages.detailLink}</Link>
	</div>
}

function SummaryList({ heading, items }: { heading: string; items: string[] }) {
	if (!items.length) return null
	return <section className="mt-6"><h3 className="font-semibold">{heading}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{items.map((item, index) => <li key={`${item}:${index}`}>{item}</li>)}</ul></section>
}

function normalizeCountryCode(value: string | null) {
	return value && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null
}

function outreachPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/our-outreach${slug ? `/${slug}` : ''}`
}

function formatStatistic(statistic: OutreachStatistic, locale: AppLocale) {
	if (statistic.displayValue) return statistic.displayValue
	if (statistic.numericValue === null) return '—'
	const value = new Intl.NumberFormat(locale).format(statistic.numericValue)
	return statistic.unit ? `${value} ${statistic.unit}` : value
}
