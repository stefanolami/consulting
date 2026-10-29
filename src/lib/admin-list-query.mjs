// List state in the URL (audit NEWS-09, OUT-08, CAT-09, slice 5a): search,
// filters, tab and page live in the query string, so a list can be linked,
// reloaded, and walked with back and forward. Each list declares its
// parameters once; parsing never throws (an unknown or malformed value falls
// back to the default), and a URL leaves out every parameter at its default.
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

/** The site's locales, in the order the admin shows them (src/i18n/routing.ts). */
export const LIST_LOCALES = ['en', 'de', 'it', 'pt-BR', 'pt-PT']

/**
 * The translation states a list can filter by. "missing" (no translation)
 * and "not-live" (no live translation; for a language other than English,
 * of a record that is live in English) need a language.
 */
export const TRANSLATION_STATES = ['draft', 'scheduled', 'published', 'archived', 'missing', 'not-live']
const NEEDS_LOCALE = ['missing', 'not-live']

const MAX_SEARCH = 100
const KEY = /^[a-z0-9][a-z0-9-]{0,62}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/*
 * A list spec maps each parameter to one of:
 * - `{ type: 'search' }`: free text, trimmed, inner whitespace collapsed,
 *   at most 100 characters; default ''.
 * - `{ type: 'enum', values, default? }`: one of `values`; default `default` or ''.
 * - `{ type: 'key' }`: a lowercase slug key (for example an article kind); default ''.
 * - `{ type: 'id', also? }`: a UUID, or one of `also` (for example 'none'); default ''.
 * - `{ type: 'page' }`: a whole number from 1; default 1.
 */
export const NEWSROOM_LIST = {
	q: { type: 'search' },
	status: { type: 'enum', values: TRANSLATION_STATES },
	locale: { type: 'enum', values: LIST_LOCALES },
	kind: { type: 'key' },
	page: { type: 'page' },
}

export const COUNTRY_LIST = {
	q: { type: 'search' },
	coverage: { type: 'enum', values: ['covered', 'not-covered', 'all'], default: 'covered' },
	region: { type: 'id', also: ['none'] },
	status: { type: 'enum', values: TRANSLATION_STATES },
	locale: { type: 'enum', values: LIST_LOCALES },
	page: { type: 'page' },
}

export const PEOPLE_LIST = { q: { type: 'search' } }

export const CATALOGUE_LIST = {
	kind: { type: 'enum', values: ['services', 'sectors'], default: 'services' },
	q: { type: 'search' },
}

export const PARTNER_LIST = {
	kind: { type: 'enum', values: ['partners', 'endorsements'], default: 'partners' },
	q: { type: 'search' },
}

export const NEWSROOM_PAGE_SIZE = 20
export const COUNTRY_PAGE_SIZE = 50

/** The first value of a parameter from URLSearchParams or a Next.js `searchParams` object. */
function readParam(source, name) {
	if (!source) return undefined
	if (typeof source.get === 'function') return source.get(name) ?? undefined
	const value = source[name]
	return Array.isArray(value) ? value[0] : value
}

function defaultOf(param) {
	if (param.type === 'page') return 1
	if (param.type === 'enum') return param.default ?? ''
	return ''
}

function parseOne(param, raw) {
	const fallback = defaultOf(param)
	if (typeof raw !== 'string') return fallback
	if (param.type === 'search') return normalizeSearch(raw)
	if (param.type === 'page') return /^\d{1,6}$/.test(raw) && Number(raw) >= 1 ? Number(raw) : fallback
	if (param.type === 'enum') return param.values.includes(raw) ? raw : fallback
	if (param.type === 'key') return KEY.test(raw) ? raw : fallback
	if (param.type === 'id') return UUID.test(raw.toLowerCase()) ? raw.toLowerCase() : (param.also ?? []).includes(raw) ? raw : fallback
	return fallback
}

/** Search text as the list uses it: trimmed, single spaces, at most 100 characters. */
export function normalizeSearch(text) {
	return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SEARCH).trim()
}

/**
 * The list state from the URL: every parameter of `spec`, at its default
 * when absent or invalid. A "missing" or "not-live" filter without a
 * language is dropped, since it only means something for one language.
 */
export function parseListQuery(spec, source) {
	const state = Object.fromEntries(Object.entries(spec).map(([name, param]) => [name, parseOne(param, readParam(source, name))]))
	if ('status' in state && 'locale' in state && NEEDS_LOCALE.includes(state.status) && !state.locale) state.status = ''
	return state
}

/** The query string for a state ('' or '?…'), in spec order, without defaults. */
export function listQueryString(spec, state) {
	const params = new URLSearchParams()
	for (const [name, param] of Object.entries(spec)) {
		const value = state[name]
		if (value === undefined || value === null || value === defaultOf(param)) continue
		params.set(name, String(value))
	}
	const text = params.toString()
	return text ? `?${text}` : ''
}

/**
 * The state after a change. Changing anything other than the page returns
 * to page 1, since the old page may no longer exist.
 */
export function changeListQuery(spec, state, change) {
	const next = { ...state, ...change }
	if ('page' in spec && !('page' in change)) next.page = 1
	return parseListQuery(spec, Object.fromEntries(Object.entries(next).map(([name, value]) => [name, value === undefined || value === null ? undefined : String(value)])))
}

/** Whether a search or filter is set: any parameter except the page and those in `ignore` differs from its default. */
export function hasListFilters(spec, state, ignore = []) {
	return Object.entries(spec).some(([name, param]) => param.type !== 'page' && !ignore.includes(name) && state[name] !== defaultOf(param))
}

/**
 * The rows of one page: `page` clamped to 1…pageCount, the zero-based `from`
 * and `to` (inclusive) for a range query, and the 1-based numbers of the
 * first and last row shown (0 and 0 for an empty list).
 */
export function pageWindow(total, page, pageSize) {
	const count = Math.max(0, Math.floor(Number(total) || 0))
	const size = Math.max(1, Math.floor(pageSize))
	const pageCount = Math.max(1, Math.ceil(count / size))
	const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pageCount)
	const from = (current - 1) * size
	return { page: current, pageCount, from, to: from + size - 1, first: count ? from + 1 : 0, last: Math.min(count, from + size) }
}

/**
 * A PostgREST `ilike` pattern that finds `text` anywhere: LIKE wildcards
 * (% and _) and the escape character are matched literally, and characters
 * PostgREST reads as syntax inside `or=(…)` filters (, ( ) " * :) are
 * replaced by the single-character wildcard.
 */
export function containsPattern(text) {
	const escaped = normalizeSearch(text).replace(/[\\%_]/g, (char) => `\\${char}`).replace(/[,()"*:]/g, '_')
	return `%${escaped}%`
}
