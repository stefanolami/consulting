// Our Outreach URL state (control tower §15.12.1). Plain JavaScript so
// `node --test` can import it; types are in outreach-state.d.mts.
//
// The URL carries at most one of two canonical parameters:
// - `?region=<stable key>` (regions.stable_key), the region view;
// - `?country=<ISO alpha-2>`, the country view, which implies its region.

const REGION_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COUNTRY_CODE = /^[A-Za-z]{2}$/

/** Group key for published countries whose region is not published in the locale. */
export const OTHER_REGION_KEY = 'other'

export const WORLD_VIEW = Object.freeze({ country: null, region: null })

// Reads `region` and `country` from URLSearchParams (or anything with `get`),
// normalising case and dropping malformed values.
export function parseOutreachParams(params) {
	const region = params?.get('region')?.trim().toLowerCase() ?? ''
	const country = params?.get('country')?.trim() ?? ''
	return {
		country: COUNTRY_CODE.test(country) ? country.toUpperCase() : null,
		region: REGION_KEY.test(region) ? region : null,
	}
}

// Resolves parsed parameters against the published regions. A known country
// wins and brings its region; otherwise a known region; otherwise the world.
// `regions` is a list of `{ key, countryCodes }`.
export function resolveOutreachView(params, regions) {
	if (params.country) {
		const region = regions.find((entry) => entry.countryCodes.includes(params.country))
		if (region) return { country: params.country, region: region.key }
	}
	if (params.region && regions.some((entry) => entry.key === params.region)) return { country: null, region: params.region }
	return WORLD_VIEW
}

// The query string for a view: '' for the world, never both parameters.
export function outreachSearch(view) {
	if (view.country) return `?country=${encodeURIComponent(view.country)}`
	if (view.region) return `?region=${encodeURIComponent(view.region)}`
	return ''
}

// Choosing a region opens it; choosing the open region again returns to the world.
export function regionToggleView(view, regionKey) {
	return view.region === regionKey ? WORLD_VIEW : { country: null, region: regionKey }
}

export function countryView(regionKey, countryCode) {
	return { country: countryCode, region: regionKey }
}

// Closing the summary keeps the region open.
export function closeCountryView(view) {
	return { country: null, region: view.region }
}

export function sameView(a, b) {
	return a.region === b.region && a.country === b.country
}
