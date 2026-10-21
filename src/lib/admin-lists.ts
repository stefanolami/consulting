import 'server-only'

import { containsPattern, COUNTRY_PAGE_SIZE, NEWSROOM_PAGE_SIZE, pageWindow, type COUNTRY_LIST, type ListState, type NEWSROOM_LIST } from '@/lib/admin-list-query.mjs'
import { localeStates, type LocaleStates } from '@/lib/admin-locale-states'
import { failIf, liveNow, looseClient, record, rows, text, whereState, type Query, type Row } from '@/lib/admin-query'
import type { StoredStatus } from '@/lib/publication.mjs'

/*
 * The newsroom and country lists (audit NEWS-09, NEWS-13, OUT-08): search,
 * filters and pagination run in the database, one page at a time, with an
 * exact count. Each row carries every locale's state for the locale chips.
 *
 * - Search matches the title (articles) or name (countries), or the URL
 *   slug, in any language. PostgREST cannot combine a canonical column and an
 *   embedded one in one `or`, so the stable key and ISO code are not
 *   searched; slugs usually carry the same words.
 * - Status and language filter the embedded translations: "published in
 *   German", "draft in any language", "missing" in German (no German
 *   translation) or "not live" in German: live in English but not in German
 *   (no German translation, or one that is a draft, scheduled or archived;
 *   the dashboard's translation numbers link here).
 */

function localeStatesOf(translations: Row[], now: Date) {
	return localeStates(translations.map((row) => ({ locale: text(row.locale), status: text(row.status) as StoredStatus, published_at: text(row.published_at) || null, scheduled_for: text(row.scheduled_for) || null })), now)
}

type Page<T> = { items: T[]; total: number; page: number; pageCount: number; first: number; last: number }

/**
 * Runs a list query for one page. A page past the end (after a filter
 * narrowed the list, or an edited URL) is answered with the last page.
 */
async function onePage(build: () => Query, page: number, pageSize: number): Promise<{ data: Row[]; window: ReturnType<typeof pageWindow>; total: number }> {
	let window = pageWindow(Number.MAX_SAFE_INTEGER, page, pageSize)
	let { data, count, error } = await build().range(window.from, window.to)
	failIf('the list', error)
	const total = count ?? 0
	const clamped = pageWindow(total, page, pageSize)
	if (clamped.page !== window.page) {
		window = clamped
		;({ data, count, error } = await build().range(window.from, window.to))
		failIf('the list', error)
	}
	return { data: rows(data), window: pageWindow(count ?? total, window.page, pageSize), total: count ?? total }
}

/** Adds the search and state filters shared by both lists. `translations` is the translation table. */
function filtered(query: Query, translations: string, label: string, state: { q: string; status: string; locale: string }, now: string) {
	let next = query
	if (state.q) {
		const pattern = containsPattern(state.q)
		next = next.or(`${label}.ilike.${pattern},slug.ilike.${pattern}`, { referencedTable: 'search' })
	}
	if (state.locale) next = next.eq('filter.locale', state.locale)
	if (state.status === 'missing') next = next.is('filter', null)
	else if (state.status === 'not-live') {
		next = next.eq('filter.status', 'published').or(liveNow(now), { referencedTable: 'filter' }).is('filter', null)
		// Another language: a translation gap, so only records live in English (the dashboard's numbers).
		if (state.locale !== 'en') next = next.eq('base.locale', 'en').eq('base.status', 'published').or(liveNow(now), { referencedTable: 'base' })
	}
	else if (state.status) next = whereState(next, 'filter', state.status as 'draft' | 'scheduled' | 'published' | 'archived', now)
	return next
}

function filterEmbeds(translations: string, state: { q: string; status: string; locale: string }) {
	const search = state.q ? `, search:${translations}!inner(locale)` : ''
	const filter = state.status === 'missing' || state.status === 'not-live' ? `, filter:${translations}(locale)` : state.status || state.locale ? `, filter:${translations}!inner(locale)` : ''
	const base = state.status === 'not-live' && state.locale !== 'en' ? `, base:${translations}!inner(locale)` : ''
	return `${search}${filter}${base}`
}

export type NewsroomRow = { id: string; stableKey: string; title: string | null; kind: string; authorCount: number; isFeatured: boolean; featuredOrder: number | null; updatedAt: string; states: LocaleStates }

export async function loadNewsroomList(state: ListState<typeof NEWSROOM_LIST>): Promise<Page<NewsroomRow>> {
	const supabase = await looseClient()
	const now = new Date()
	const nowText = now.toISOString()
	const select = `id, stable_key, kind, is_featured, featured_order, updated_at, translations:article_translations(locale, title, status, published_at, scheduled_for), authors:article_authors(count)${filterEmbeds('article_translations', state)}`
	const build = () => {
		let query = filtered(supabase.from('articles').select(select, { count: 'exact' }), 'article_translations', 'title', state, nowText)
		if (state.kind) query = query.eq('kind', state.kind)
		return query.order('updated_at', { ascending: false }).order('id')
	}
	const { data, window, total } = await onePage(build, state.page, NEWSROOM_PAGE_SIZE)
	return {
		...window, total,
		items: data.map((row) => {
			const translations = rows(row.translations)
			const english = translations.find((item) => item.locale === 'en') ?? translations[0]
			return {
				id: text(row.id), stableKey: text(row.stable_key), title: english ? text(english.title) : null, kind: text(row.kind),
				authorCount: Number(record(row.authors).count ?? 0), isFeatured: row.is_featured === true,
				featuredOrder: typeof row.featured_order === 'number' ? row.featured_order : null, updatedAt: text(row.updated_at),
				states: localeStatesOf(translations, now),
			}
		}),
	}
}

export type CountryRow = { code: string; name: string | null; isCovered: boolean; regionId: string | null; displayOrder: number; lastReviewedOn: string | null; states: LocaleStates }

export async function loadCountryList(state: ListState<typeof COUNTRY_LIST>): Promise<Page<CountryRow>> {
	const supabase = await looseClient()
	const now = new Date()
	const nowText = now.toISOString()
	const select = `code, region_id, is_covered, display_order, last_reviewed_on, translations:country_translations(locale, name, status, published_at, scheduled_for)${filterEmbeds('country_translations', state)}`
	const build = () => {
		let query = filtered(supabase.from('countries').select(select, { count: 'exact' }), 'country_translations', 'name', state, nowText)
		if (state.coverage) query = query.eq('is_covered', state.coverage === 'covered')
		if (state.region === 'none') query = query.is('region_id', null)
		else if (state.region) query = query.eq('region_id', state.region)
		return query.order('display_order').order('code')
	}
	const { data, window, total } = await onePage(build, state.page, COUNTRY_PAGE_SIZE)
	return {
		...window, total,
		items: data.map((row) => {
			const translations = rows(row.translations)
			const english = translations.find((item) => item.locale === 'en')
			return {
				code: text(row.code), name: english ? text(english.name) : null, isCovered: row.is_covered === true,
				regionId: text(row.region_id) || null, displayOrder: Number(row.display_order ?? 0), lastReviewedOn: text(row.last_reviewed_on) || null,
				states: localeStatesOf(translations, now),
			}
		}),
	}
}
