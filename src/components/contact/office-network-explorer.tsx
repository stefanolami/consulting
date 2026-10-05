'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { PublicOfficeCountry } from '@/lib/public-offices'
import { cn } from '@/lib/utils'

import {
	OFFICE_BADGE_SMALL_CLASS,
	OFFICE_BOTTOM_BAND_CLASS,
	OFFICE_BUTTON_LIST_CLASS,
	OFFICE_BUTTON_SIZE_CLASS,
	OFFICE_CARD_GRID_CLASS,
	OFFICE_CITIES_CLASS,
	OFFICE_DESKTOP_CLASS,
	OFFICE_EMAILS_CLASS,
	OFFICE_HEADING_CLASS,
	OFFICE_MAP_CLASS,
	OFFICE_NAME_CLASS,
	OFFICE_TOP_BAND_CLASS,
} from './office-network-styles'
import { useHydrated } from './use-hydrated'

const PANEL_ID = 'office-network-panel'
const PANEL_TITLE_ID = 'office-network-panel-title'
const WORLD_MAP_ASSET = 'contact-world-map'
const countryIconAsset = (code: string) => `contact-country-icon-${code.toLowerCase()}`

// "Our global network" (Figma 5408:348 desktop, 5651:504 mobile; legacy
// contact-map-desktop.jsx and contact-map-mobile.jsx). The server-rendered
// markup lists every country as a card: the mobile design, and what visitors
// without JavaScript get at every width. Once hydrated, wide screens switch to
// the desktop design: one toggle button per country and a single panel for the
// chosen country (Figma annotation "TITLE, E-MAIL & PHONE NUMBER CHANGE BASED
// ON SELECTION"), starting with the first country as the legacy page did.
export function OfficeNetworkExplorer({ countries }: { countries: PublicOfficeCountry[] }) {
	const t = useTranslations('Contact.network')
	const hydrated = useHydrated()
	const [selectedCode, setSelectedCode] = useState(countries[0]?.code)
	const selected = countries.find((country) => country.code === selectedCode) ?? countries[0]

	return (
		<section aria-labelledby="office-network-heading">
			<div className={OFFICE_TOP_BAND_CLASS}>
				<h2 className={OFFICE_HEADING_CLASS} id="office-network-heading">{t('title')}</h2>
				{hydrated ? (
					<div aria-label={t('chooseCountry')} className="hidden lg:block" role="group">
						<ul className={OFFICE_BUTTON_LIST_CLASS}>
							{countries.map((country) => (
								<li key={country.code}>
									<button
										aria-controls={PANEL_ID}
										aria-pressed={country.code === selected?.code}
										className={cn(
											'block cursor-pointer rounded-full transition-[box-shadow,transform] duration-200 hover:shadow-lg motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none',
											'aria-pressed:shadow-lg aria-pressed:ring-4 aria-pressed:ring-tp-teal aria-pressed:ring-offset-4 aria-pressed:ring-offset-surface-soft',
											'focus-visible:outline-3 focus-visible:outline-offset-[10px] focus-visible:outline-focus',
										)}
										onClick={() => setSelectedCode(country.code)}
										type="button"
									>
										<CountryBadge code={country.code} name={country.name} size="large" />
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
			<div className={OFFICE_BOTTOM_BAND_CLASS}>
				<ul className={cn(OFFICE_CARD_GRID_CLASS, hydrated && 'lg:hidden')}>
					{countries.map((country) => (
						<li className="flex flex-col items-center" key={country.code}>
							<CountryBadge code={country.code} decorative name={country.name} size="small" />
							<CountryOffices className="mt-5 w-full max-w-[17rem]" country={country} />
						</li>
					))}
				</ul>
				{hydrated && selected ? (
					<div className={cn(OFFICE_DESKTOP_CLASS, 'hidden lg:grid')}>
						{/* One panel for the chosen country; changes are announced politely. */}
						<div aria-labelledby={PANEL_TITLE_ID} aria-live="polite" className="justify-self-center" id={PANEL_ID} role="region">
							<CountryOffices className="w-[min(20rem,100%)]" country={selected} titleId={PANEL_TITLE_ID} />
						</div>
						<WorldMapPlaceholder label={t('mapPlaceholder', { name: WORLD_MAP_ASSET })} />
					</div>
				) : null}
			</div>
		</section>
	)
}

// The country's name over a rule, its cities and email address(es) (Figma
// "AUSTRIA / Vienna / austria@…" blocks).
function CountryOffices({ className, country, titleId }: { className?: string; country: PublicOfficeCountry; titleId?: string }) {
	return (
		<div className={cn('text-center text-tp-teal', className)}>
			<h3 className={cn(OFFICE_NAME_CLASS, 'wrap-anywhere')} id={titleId}>{country.name}</h3>
			<ul className={OFFICE_CITIES_CLASS}>
				{country.cities.map((city) => <li key={city}>{city}</li>)}
			</ul>
			{country.emails.length ? (
				<ul className={OFFICE_EMAILS_CLASS}>
					{country.emails.map((email) => (
						<li key={email}>
							<a className="break-all underline decoration-1 underline-offset-[0.2em] hover:decoration-2 focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href={`mailto:${email}`}>
								{email}
							</a>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}

// PLACEHOLDER: the Figma "Country Icon Button" artwork (a country silhouette
// in a navy disc) is not in the repository (docs/figma-asset-needs.md). The
// disc and the name are drawn here; the dashed ring marks the missing outline.
// The small card badge omits the name, which the card heading repeats and
// which does not fit a 6 rem disc at a readable size.
function CountryBadge({ code, decorative = false, name, size }: { code: string; decorative?: boolean; name: string; size: 'large' | 'small' }) {
	return (
		<span
			aria-hidden={decorative || undefined}
			className={cn(
				'relative grid place-items-center rounded-full bg-tp-blue-muted p-3 text-center font-serif font-bold uppercase text-on-brand',
				size === 'large' ? cn(OFFICE_BUTTON_SIZE_CLASS, 'text-body-lg') : OFFICE_BADGE_SMALL_CLASS,
			)}
			data-placeholder-asset={countryIconAsset(code)}
		>
			<span aria-hidden="true" className="absolute inset-[12%] rounded-full border-2 border-dashed border-on-brand/35" />
			{size === 'large' ? <span className="relative max-w-full wrap-anywhere [hyphens:auto]">{name}</span> : null}
		</span>
	)
}

// PLACEHOLDER: the Figma world-map line drawing ("Country Icon Button 00 -
// World") is not in the repository (docs/figma-asset-needs.md).
function WorldMapPlaceholder({ label }: { label: string }) {
	return (
		<div className={cn(OFFICE_MAP_CLASS, 'grid place-items-center rounded-control border-2 border-dashed border-tp-navy/40 px-4 text-center font-label text-label text-tp-navy')} data-placeholder-asset={WORLD_MAP_ASSET}>
			<span aria-hidden="true">{label}</span>
		</div>
	)
}
