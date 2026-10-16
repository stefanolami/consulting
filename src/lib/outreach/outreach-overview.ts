import type { AppLocale } from '@/i18n/routing'
import type { OutreachCountry, OutreachMedia } from '@/lib/public-outreach'

import { countryNumericCode, countryOutline } from './country-geometry'
import { parseMapConfig, type MapConfig, type OutlinePath, type Point } from './outreach-geo.mjs'
import { OTHER_REGION_KEY } from './outreach-state.mjs'

// What the Our Outreach overview sends to the browser (control tower
// §15.12.5): the published countries reduced to what the column, map and
// summary panel show. Rich text, statistics, offices and people stay on the
// server for the detail page. Publication rules are applied by the loaders in
// src/lib/public-outreach.ts and are not repeated here.

export type OutreachOverviewService = {
	icon: OutreachMedia | null
	id: string
	name: string
	slug: string
}

export type OutreachOverviewCountry = {
	code: string
	coverageSummary: string | null
	flag: OutreachMedia | null
	/** `countries.map_config` coordinates: where the marker goes when the topology has no shape. */
	marker: Point | null
	name: string
	/** ISO numeric code matching the topology feature ids; null when there is none. */
	numericCode: string | null
	outline: OutreachMedia | null
	regionKey: string
	services: OutreachOverviewService[]
	/** Generated outline for the panel; null when the 110m topology does not draw the country. */
	shape: OutlinePath | null
	slug: string
	summary: string | null
}

export type OutreachOverviewRegion = {
	countryCodes: string[]
	key: string
	mapConfig: MapConfig | null
	/** Null for the group of countries whose region is not published in the locale. */
	name: string | null
}

export type OutreachOverview = {
	countries: OutreachOverviewCountry[]
	regions: OutreachOverviewRegion[]
}

export function buildOutreachOverview(countries: OutreachCountry[], locale: AppLocale): OutreachOverview {
	const collator = new Intl.Collator(locale)
	const sorted = [...countries].sort((a, b) => a.displayOrder - b.displayOrder || collator.compare(a.name, b.name))
	const regions = new Map<string, OutreachOverviewRegion & { displayOrder: number }>()
	for (const country of sorted) {
		const key = country.region?.key ?? OTHER_REGION_KEY
		const region = regions.get(key) ?? {
			countryCodes: [],
			displayOrder: country.region?.displayOrder ?? Number.POSITIVE_INFINITY,
			key,
			mapConfig: country.region ? parseMapConfig(country.region.mapConfig) : null,
			name: country.region?.name ?? null,
		}
		region.countryCodes.push(country.code)
		regions.set(key, region)
	}
	return {
		countries: sorted.map((country) => ({
			code: country.code,
			coverageSummary: country.coverageSummary,
			flag: country.flag,
			marker: parseMapConfig(country.mapConfig)?.center ?? null,
			name: country.name,
			numericCode: countryNumericCode(country.code),
			outline: country.outline,
			regionKey: country.region?.key ?? OTHER_REGION_KEY,
			services: country.services.map(({ icon, id, name, slug }) => ({ icon, id, name, slug })),
			shape: countryOutline(country.code),
			slug: country.slug,
			summary: country.summary,
		})),
		// The unpublished-region group always comes last.
		regions: [...regions.values()]
			.sort((a, b) => (a.name === null ? 1 : 0) - (b.name === null ? 1 : 0) || a.displayOrder - b.displayOrder || collator.compare(a.name ?? '', b.name ?? ''))
			.map(({ countryCodes, key, mapConfig, name }) => ({ countryCodes, key, mapConfig, name })),
	}
}
