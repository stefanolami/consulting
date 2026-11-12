// The audience choice (control tower §23.10, product owner 2026-11-12):
// Business, Government Institute or Academia, or none. The choice themes the
// header and heroes site-wide and highlights that audience's services on the
// Services page (Figma 6393:6, 6633:100, 6633:32).
//
// Rendering stays static: the server never reads the choice. It lives in
// localStorage and in the `data-audience` attribute of <html>, which an
// inline script sets before the first paint (audienceBootScript) and the CSS
// in globals.css reads. On the Services page `?audience=` wins over the
// stored value so a filtered view can be shared.
//
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

/** The audience keys, in display order. Also the database check (migration 20261112120000). */
export const AUDIENCES = Object.freeze(['business', 'government', 'academia'])

/** The admin labels ("Show for"); the public labels are in the `Audience` messages. */
export const AUDIENCE_ADMIN_LABELS = Object.freeze({
	business: 'Business',
	government: 'Government Institute',
	academia: 'Academia',
})

export const AUDIENCE_STORAGE_KEY = 'tp-audience'
export const AUDIENCE_PARAM = 'audience'
export const AUDIENCE_ATTRIBUTE = 'data-audience'
/** Dispatched on `window` whenever the applied audience changes. */
export const AUDIENCE_EVENT = 'tp-audience-change'

export function isAudience(value) {
	return typeof value === 'string' && AUDIENCES.includes(value)
}

/** An audience key from a URL parameter, stored value or attribute; null for anything else. */
export function parseAudience(value) {
	if (typeof value !== 'string') return null
	const key = value.trim().toLowerCase()
	return isAudience(key) ? key : null
}

/** Audience keys from a form or database value: known keys only, no duplicates, in display order. */
export function parseAudienceList(value) {
	const values = Array.isArray(value) ? value : value == null ? [] : [value]
	const keys = new Set(values.map(parseAudience).filter(Boolean))
	return AUDIENCES.filter((audience) => keys.has(audience))
}

/** The URL wins over the stored value; an invalid URL value falls back to the stored one. */
export function resolveAudience({ stored = null, url = null } = {}) {
	return parseAudience(url) ?? parseAudience(stored)
}

/** Choosing the current audience again, or "All" (null), returns to none. */
export function nextAudience(current, chosen) {
	const next = parseAudience(chosen)
	return next && next !== parseAudience(current) ? next : null
}

/**
 * How a service tile looks for the chosen audience: `default` with no
 * audience, `highlighted` when the service is for it, otherwise `muted`.
 */
export function tileEmphasis(serviceAudiences, active) {
	const audience = parseAudience(active)
	if (!audience) return 'default'
	return parseAudienceList(serviceAudiences).includes(audience) ? 'highlighted' : 'muted'
}

/** Whether `pathname` is the Services listing in any locale (`/services`, `/de/services`). */
export function isServicesListingPath(pathname, locales) {
	return servicesListingPattern(locales).test(pathname)
}

function servicesListingPattern(locales) {
	const prefixes = locales.map((locale) => locale.replace(/[^A-Za-z-]/g, '')).join('|')
	return new RegExp(`^(?:/(?:${prefixes}))?/services/?$`)
}

/** `search` with the audience parameter set to `audience`, or removed for none. Other parameters are kept. */
export function audienceSearch(search, audience) {
	const params = new URLSearchParams(search)
	const key = parseAudience(audience)
	if (key) params.set(AUDIENCE_PARAM, key)
	else params.delete(AUDIENCE_PARAM)
	const query = params.toString()
	return query ? `?${query}` : ''
}

/**
 * The inline <head> script that applies the audience before the first paint,
 * as theme scripts do. On the Services listing a valid `?audience=` wins and
 * is stored; elsewhere the stored value applies. Storage may be unavailable
 * (private mode, blocked site data), so every access is guarded.
 */
export function audienceBootScript(locales) {
	const pattern = servicesListingPattern(locales).source
	return `(function(){try{var a=${JSON.stringify(AUDIENCES)},k=${JSON.stringify(AUDIENCE_STORAGE_KEY)},p=function(v){v=typeof v==='string'?v.trim().toLowerCase():'';return a.indexOf(v)>-1?v:null},u=null,s=null;if(new RegExp(${JSON.stringify(pattern)}).test(location.pathname))u=p(new URLSearchParams(location.search).get(${JSON.stringify(AUDIENCE_PARAM)}));try{s=p(localStorage.getItem(k));if(u&&u!==s)localStorage.setItem(k,u)}catch(e){}var v=u||s;if(v)document.documentElement.setAttribute(${JSON.stringify(AUDIENCE_ATTRIBUTE)},v)}catch(e){}})()`
}
