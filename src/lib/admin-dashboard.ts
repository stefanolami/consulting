import 'server-only'

import { altTextGaps, DASHBOARD_LIST_LIMIT, mergeRecent, mergeSoonest, scheduleWindow, total } from '@/lib/admin-dashboard-rules.mjs'
import { failIf as fail, liveNow as liveFilter, looseClient as loose, record, rows, text, type Loose, type Query, type Row } from '@/lib/admin-query'
import { createClient } from '@/lib/supabase/server'

/*
 * Dashboard data (audit DASH-01, DASH-02, control tower §12.1). Numbers are
 * count queries (`head: true`), lists are short `limit` queries, and the
 * image check reads only live records that show an image; no table is read
 * whole. The ten translated content types share one query shape, which the
 * generated types cannot express for a table chosen at run time, so these
 * queries use the run-time query shape of admin-query.ts.
 */

export type SourceKey = 'people' | 'services' | 'sectors' | 'articles' | 'countries' | 'offices' | 'regions' | 'partners' | 'endorsements' | 'legal'

type Source = {
	key: SourceKey
	/** What one record is called, for example "Team profile". */
	noun: string
	/** The plural for counts, for example "team profiles". */
	plural: string
	canonical: string
	translations: string
	/** The id column on the canonical table ('id', or 'code' for countries). */
	id: string
	/** The canonical column that names a record when its translation has no name. */
	canonicalLabel: string
	/** The translation column that names a record, when there is one. */
	translationLabel: string | null
	/** Canonical filters: archived records and non-team people are left out. */
	scope: Record<string, boolean>
	href: (id: string, label: string) => string
	/** The list filtered to records not yet live in `locale`, where the list has that filter. */
	missingHref?: (locale: string) => string
	/**
	 * Extra canonical filters for drafts: every country has a seeded draft
	 * reference row, so only covered countries' drafts need attention.
	 */
	draftScope?: Record<string, boolean>
}

export const SOURCES: readonly Source[] = [
	{ key: 'people', noun: 'Team profile', plural: 'team profiles', canonical: 'people', translations: 'people_translations', id: 'id', canonicalLabel: 'display_name', translationLabel: null, scope: { is_team_member: true, is_active: true }, href: (id) => `/admin/people/${id}` },
	{ key: 'services', noun: 'Service', plural: 'services', canonical: 'services', translations: 'service_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'name', scope: { is_active: true }, href: (id) => `/admin/catalogue/services/${id}` },
	{ key: 'sectors', noun: 'Sector', plural: 'sectors', canonical: 'sectors', translations: 'sector_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'name', scope: { is_active: true }, href: (id) => `/admin/catalogue/sectors/${id}` },
	{ key: 'articles', noun: 'Article', plural: 'articles', canonical: 'articles', translations: 'article_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'title', scope: {}, href: (id) => `/admin/newsroom/${id}`, missingHref: (locale) => `/admin/newsroom?status=not-live&locale=${locale}` },
	{ key: 'countries', noun: 'Country', plural: 'countries', canonical: 'countries', translations: 'country_translations', id: 'code', canonicalLabel: 'code', translationLabel: 'name', scope: {}, href: (code) => `/admin/outreach/${code}`, missingHref: (locale) => `/admin/outreach?status=not-live&locale=${locale}`, draftScope: { is_covered: true } },
	{ key: 'offices', noun: 'Office', plural: 'offices', canonical: 'offices', translations: 'office_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'name', scope: { is_active: true }, href: (id) => `/admin/outreach/offices/${id}` },
	{ key: 'regions', noun: 'Region', plural: 'regions', canonical: 'regions', translations: 'region_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'name', scope: { is_active: true }, href: (id) => `/admin/outreach/regions/${id}` },
	{ key: 'partners', noun: 'Partner', plural: 'partners', canonical: 'partners', translations: 'partner_translations', id: 'id', canonicalLabel: 'name', translationLabel: null, scope: { is_active: true }, href: (id) => `/admin/partners/partners/${id}` },
	{ key: 'endorsements', noun: 'Endorsement', plural: 'endorsements', canonical: 'endorsements', translations: 'endorsement_translations', id: 'id', canonicalLabel: 'attribution_name', translationLabel: null, scope: { is_active: true }, href: (id) => `/admin/partners/endorsements/${id}` },
	{ key: 'legal', noun: 'Legal page', plural: 'legal pages', canonical: 'legal_pages', translations: 'legal_page_translations', id: 'id', canonicalLabel: 'stable_key', translationLabel: 'title', scope: { is_active: true }, href: (_id, key) => `/admin/legal/${key}` },
]

export type DashboardItem = { key: string; at: string | null; source: SourceKey | 'media' | 'settings' | 'redirects'; noun: string; label: string; locale: string | null; href: string }







/** The active locales in their display order; the default comes first. */
export async function launchLocales() {
	const supabase = await createClient()
	const { data, error } = await supabase.from('locales').select('code, label, is_default').eq('is_active', true).order('display_order')
	fail('the languages', error)
	const locales = data ?? []
	return { all: locales.map((item) => item.code), byCode: Object.fromEntries(locales.map((item) => [item.code, item.label])) as Record<string, string>, defaultLocale: locales.find((item) => item.is_default)?.code ?? 'en' }
}

function translationSelect(source: Source) {
	const canonicalColumns = [...new Set([source.id, source.canonicalLabel])].join(', ')
	return `locale, status, published_at, scheduled_for, updated_at${source.translationLabel ? `, ${source.translationLabel}` : ''}, record:${source.canonical}!inner(${canonicalColumns})`
}

function scopeTranslations(query: Query, source: Source, extra: Record<string, boolean> = {}) {
	return Object.entries({ ...source.scope, ...extra }).reduce((current, [column, value]) => current.eq(`record.${column}`, value), query)
}

function scopeCanonical(query: Query, source: Source) {
	return Object.entries(source.scope).reduce((current, [column, value]) => current.eq(column, value), query)
}

function translationItem(source: Source, row: Row, at: unknown): DashboardItem {
	const parent = record(row.record)
	const id = text(parent[source.id])
	const canonicalLabel = text(parent[source.canonicalLabel])
	const label = (source.translationLabel ? text(row[source.translationLabel]) : '') || canonicalLabel || id
	const locale = text(row.locale)
	return { key: `${source.key}:${id}`, at: text(at) || null, source: source.key, noun: source.noun, label, locale, href: source.href(id, canonicalLabel) }
}

// Counts ----------------------------------------------------------------------

export type AreaCounts = {
	people: { total: number; liveInDefault: number; archived: number }
	services: { total: number; liveInDefault: number }
	sectors: { total: number; liveInDefault: number }
	articles: { total: number; liveInDefault: number }
	countries: { total: number; covered: number; liveInDefault: number }
	offices: { total: number }
	regions: { total: number }
	partners: { total: number; liveInDefault: number }
	endorsements: { total: number; liveInDefault: number }
	legal: { total: number; liveInDefault: number }
	media: { total: number }
	redirects: { total: number; enabled: number }
	defaultLocale: string
}

function sourceOf(key: SourceKey) {
	return SOURCES.find((source) => source.key === key)!
}

async function countCanonical(supabase: Loose, source: Source, extra: Record<string, boolean> = {}) {
	const query = scopeCanonical(supabase.from(source.canonical).select(source.id, { count: 'exact', head: true }), source)
	const { count, error } = await Object.entries(extra).reduce((current, [column, value]) => current.eq(column, value), query)
	fail(source.plural, error)
	return count ?? 0
}

/** Records (in scope) with a translation live in `locale` now. */
async function countLiveIn(supabase: Loose, source: Source, locale: string, now: string) {
	const { count, error } = await scopeCanonical(supabase.from(source.canonical).select(`${source.id}, live:${source.translations}!inner(locale)`, { count: 'exact', head: true }), source)
		.eq('live.locale', locale).eq('live.status', 'published').or(liveFilter(now), { referencedTable: 'live' })
	fail(`live ${source.plural}`, error)
	return count ?? 0
}

export async function loadAreaCounts(): Promise<AreaCounts> {
	const supabase = await loose()
	const now = new Date().toISOString()
	const { defaultLocale } = await launchLocales()
	const live = (key: SourceKey) => countLiveIn(supabase, sourceOf(key), defaultLocale, now)
	const all = (key: SourceKey) => countCanonical(supabase, sourceOf(key))
	const head = async (table: string, filters: Record<string, boolean> = {}) => {
		const { count, error } = await Object.entries(filters).reduce((query, [column, value]) => query.eq(column, value), supabase.from(table).select('*', { count: 'exact', head: true }))
		fail(table, error)
		return count ?? 0
	}
	const [people, peopleLive, peopleArchived, services, servicesLive, sectors, sectorsLive, articles, articlesLive, countries, covered, countriesLive, offices, regions, partners, partnersLive, endorsements, endorsementsLive, legal, legalLive, media, redirects, redirectsEnabled] = await Promise.all([
		all('people'), live('people'), head('people', { is_team_member: true, is_active: false }),
		all('services'), live('services'), all('sectors'), live('sectors'),
		all('articles'), live('articles'),
		all('countries'), head('countries', { is_covered: true }), live('countries'),
		all('offices'), all('regions'),
		all('partners'), live('partners'), all('endorsements'), live('endorsements'),
		all('legal'), live('legal'),
		head('media_assets'), head('redirects'), head('redirects', { is_active: true }),
	])
	return {
		people: { total: people, liveInDefault: peopleLive, archived: peopleArchived },
		services: { total: services, liveInDefault: servicesLive },
		sectors: { total: sectors, liveInDefault: sectorsLive },
		articles: { total: articles, liveInDefault: articlesLive },
		countries: { total: countries, covered, liveInDefault: countriesLive },
		offices: { total: offices },
		regions: { total: regions },
		partners: { total: partners, liveInDefault: partnersLive },
		endorsements: { total: endorsements, liveInDefault: endorsementsLive },
		legal: { total: legal, liveInDefault: legalLive },
		media: { total: media },
		redirects: { total: redirects, enabled: redirectsEnabled },
		defaultLocale,
	}
}

// Needs attention ---------------------------------------------------------------

export type CountedList = { count: number; items: DashboardItem[] }

/** Draft translations of records in scope (countries: covered ones), most recently edited first. */
export async function loadDrafts(): Promise<CountedList> {
	const supabase = await loose()
	const results = await Promise.all(SOURCES.map(async (source) => {
		const { data, count, error } = await scopeTranslations(supabase.from(source.translations).select(translationSelect(source), { count: 'exact' }), source, source.draftScope)
			.eq('status', 'draft').order('updated_at', { ascending: false }).limit(DASHBOARD_LIST_LIMIT)
		fail(`draft ${source.plural}`, error)
		return { count: count ?? 0, items: rows(data).map((row) => translationItem(source, row, row.updated_at)) }
	}))
	return { count: total(results.map((result) => result.count)), items: mergeRecent(results.map((result) => result.items)) }
}

/**
 * Translations that go live within the schedule window: published with a
 * future `published_at`, or a legacy 'scheduled' row due in the window.
 * Soonest first; `at` is when it goes live.
 */
export async function loadScheduled(): Promise<CountedList & { until: string }> {
	const supabase = await loose()
	const { from, to } = scheduleWindow()
	const due = `and(status.eq.published,published_at.gt."${from}",published_at.lte."${to}"),and(status.eq.scheduled,scheduled_for.gt."${from}",scheduled_for.lte."${to}")`
	const results = await Promise.all(SOURCES.map(async (source) => {
		const { data, count, error } = await scopeTranslations(supabase.from(source.translations).select(translationSelect(source), { count: 'exact' }), source)
			.or(due).order('published_at', { ascending: true, nullsFirst: false }).limit(DASHBOARD_LIST_LIMIT)
		fail(`scheduled ${source.plural}`, error)
		return { count: count ?? 0, items: rows(data).map((row) => ({ ...translationItem(source, row, text(row.status) === 'scheduled' ? row.scheduled_for : row.published_at), key: `${source.key}:${text(record(row.record)[source.id])}:${text(row.locale)}` })) }
	}))
	return { count: total(results.map((result) => result.count)), items: mergeSoonest(results.map((result) => result.items)), until: to }
}

export type TranslationGapRow = { source: SourceKey; noun: string; plural: string; liveInDefault: number; missing: Record<string, number>; missingHref?: Record<string, string> }

/**
 * For each content type, how many records live in the default language are
 * not live in each other launch language (no translation, or one that is a
 * draft, scheduled or archived). One count query per type and language.
 */
export async function loadTranslationGaps(): Promise<{ locales: string[]; labels: Record<string, string>; defaultLocale: string; rows: TranslationGapRow[] }> {
	const supabase = await loose()
	const now = new Date().toISOString()
	const { all, byCode, defaultLocale } = await launchLocales()
	const others = all.filter((locale) => locale !== defaultLocale)
	const result = await Promise.all(SOURCES.map(async (source): Promise<TranslationGapRow> => {
		const [liveInDefault, ...gaps] = await Promise.all([
			countLiveIn(supabase, source, defaultLocale, now),
			...others.map(async (locale) => {
				const { count, error } = await scopeCanonical(supabase.from(source.canonical).select(`${source.id}, base:${source.translations}!inner(locale), target:${source.translations}(locale)`, { count: 'exact', head: true }), source)
					.eq('base.locale', defaultLocale).eq('base.status', 'published').or(liveFilter(now), { referencedTable: 'base' })
					.eq('target.locale', locale).eq('target.status', 'published').or(liveFilter(now), { referencedTable: 'target' })
					.is('target', null)
				fail(`${source.plural} without ${locale}`, error)
				return count ?? 0
			}),
		])
		return {
			source: source.key, noun: source.noun, plural: source.plural, liveInDefault,
			missing: Object.fromEntries(others.map((locale, index) => [locale, gaps[index]])),
			missingHref: source.missingHref ? Object.fromEntries(others.map((locale) => [locale, source.missingHref!(locale)])) : undefined,
		}
	}))
	return { locales: others, labels: byCode, defaultLocale, rows: result }
}

export type AltGap = { key: string; noun: string; label: string; href: string; image: string; mediaHref: string; missing: string[] }

type ImageUseSpec = {
	noun: string
	table: string
	id: string
	label: string
	/** Embedded image columns: alias → foreign key name. */
	images: Record<string, string>
	imageColumns: string[]
	translations: string
	/** The translation's own alt text column (partners), if any. */
	useAlt?: string
	scope: Record<string, boolean>
	href: (id: string) => string
	imageLabel?: (alias: string) => string
}

const IMAGE_USES: readonly ImageUseSpec[] = [
	{ noun: 'Team profile', table: 'people', id: 'id', label: 'display_name', images: { portrait: 'people_portrait_media_id_fkey' }, imageColumns: ['portrait_media_id'], translations: 'people_translations', scope: { is_team_member: true, is_active: true }, href: (id) => `/admin/people/${id}` },
	{ noun: 'Service', table: 'services', id: 'id', label: 'stable_key', images: { icon: 'services_icon_media_id_fkey' }, imageColumns: ['icon_media_id'], translations: 'service_translations', scope: { is_active: true }, href: (id) => `/admin/catalogue/services/${id}` },
	{ noun: 'Sector', table: 'sectors', id: 'id', label: 'stable_key', images: { icon: 'sectors_icon_media_id_fkey' }, imageColumns: ['icon_media_id'], translations: 'sector_translations', scope: { is_active: true }, href: (id) => `/admin/catalogue/sectors/${id}` },
	{ noun: 'Article', table: 'articles', id: 'id', label: 'stable_key', images: { cover: 'articles_cover_media_id_fkey' }, imageColumns: ['cover_media_id'], translations: 'article_translations', scope: {}, href: (id) => `/admin/newsroom/${id}` },
	{ noun: 'Country', table: 'countries', id: 'code', label: 'code', images: { flag: 'countries_flag_media_id_fkey', outline: 'countries_outline_media_id_fkey' }, imageColumns: ['flag_media_id', 'outline_media_id'], translations: 'country_translations', scope: {}, href: (code) => `/admin/outreach/${code}`, imageLabel: (alias) => alias === 'flag' ? 'flag' : 'outline' },
	{ noun: 'Partner', table: 'partners', id: 'id', label: 'name', images: { logo: 'partners_logo_media_id_fkey' }, imageColumns: ['logo_media_id'], translations: 'partner_translations', useAlt: 'alt_text', scope: { is_active: true }, href: (id) => `/admin/partners/partners/${id}` },
	{ noun: 'Endorsement', table: 'endorsements', id: 'id', label: 'attribution_name', images: { portrait: 'endorsements_portrait_media_id_fkey' }, imageColumns: ['portrait_media_id'], translations: 'endorsement_translations', scope: { is_active: true }, href: (id) => `/admin/partners/endorsements/${id}` },
]

/**
 * Images on live records that have no alt text in a language the record is
 * live in. Public pages leave such an image out in that language, so each
 * one is a visible gap. Only records with an image and a live translation
 * are read. Inline article images carry their own alt text, which the
 * article contract requires on save, so they are not listed.
 */
export async function loadAltGaps(): Promise<{ count: number; items: AltGap[] }> {
	const supabase = await loose()
	const now = new Date().toISOString()
	const { all } = await launchLocales()
	const results = await Promise.all(IMAGE_USES.map(async (spec) => {
		const imageSelect = Object.entries(spec.images).map(([alias, fk]) => `${alias}:media_assets!${fk}(id, original_filename, object_path, alts:media_asset_translations(locale, alt_text))`).join(', ')
		const query = supabase.from(spec.table).select(`${[...new Set([spec.id, spec.label])].join(', ')}, ${imageSelect}, live:${spec.translations}!inner(locale${spec.useAlt ? `, ${spec.useAlt}` : ''})`)
		const scoped = Object.entries(spec.scope).reduce((current, [column, value]) => current.eq(column, value), query)
		const { data, error } = await scoped
			.or(spec.imageColumns.map((column) => `${column}.not.is.null`).join(','))
			.eq('live.status', 'published').or(liveFilter(now), { referencedTable: 'live' })
		fail(`images of ${spec.noun.toLowerCase()}s`, error)
		return rows(data).flatMap((row) => {
			const id = text(row[spec.id])
			const liveRows = rows(row.live)
			const liveLocales = liveRows.map((item) => text(item.locale))
			const useAlts = spec.useAlt ? Object.fromEntries(liveRows.map((item) => [text(item.locale), text(item[spec.useAlt!])])) : undefined
			return Object.keys(spec.images).flatMap((alias) => {
				const image = record(row[alias])
				if (!image.id) return []
				const libraryAlts = Object.fromEntries(rows(image.alts).map((item) => [text(item.locale), text(item.alt_text)]))
				const filename = text(image.original_filename) || text(image.object_path).split('/').at(-1) || text(image.id)
				return [{
					key: `${spec.table}:${id}:${alias}`,
					noun: spec.imageLabel ? `${spec.noun} ${spec.imageLabel(alias)}` : spec.noun,
					label: text(row[spec.label]) || id,
					href: spec.href(id),
					image: filename,
					mediaHref: `/admin/media?asset=${text(image.id)}`,
					liveLocales,
					libraryAlts,
					useAlts,
				}]
			})
		})
	}))
	const gaps = altTextGaps(results.flat(), all).map(({ key, noun, label, href, image, mediaHref, missing }) => ({ key, noun, label, href, image, mediaHref: `${mediaHref}&locale=${missing[0]}`, missing }))
	return { count: gaps.length, items: gaps.sort((a, b) => a.noun.localeCompare(b.noun) || a.label.localeCompare(b.label)) }
}

// Recently updated --------------------------------------------------------------

/**
 * The most recently changed records: translation edits and shared-detail
 * edits of every content type, media, settings and redirects; one entry per
 * record (its latest change).
 */
export async function loadRecent(limit = 10): Promise<DashboardItem[]> {
	const supabase = await loose()
	const translationLists = SOURCES.map(async (source) => {
		const { data, error } = await scopeTranslations(supabase.from(source.translations).select(translationSelect(source)), source)
			.order('updated_at', { ascending: false }).limit(limit)
		fail(`recent ${source.plural}`, error)
		return rows(data).map((row) => translationItem(source, row, row.updated_at))
	})
	const canonicalLists = SOURCES.map(async (source) => {
		const columns = [...new Set([source.id, source.canonicalLabel, 'updated_at'])].join(', ')
		const translationLabel = source.translationLabel ? `, names:${source.translations}(locale, ${source.translationLabel})` : ''
		const { data, error } = await scopeCanonical(supabase.from(source.canonical).select(`${columns}${translationLabel}`), source)
			.order('updated_at', { ascending: false }).limit(limit)
		fail(`recent ${source.plural}`, error)
		return rows(data).map((row): DashboardItem => {
			const id = text(row[source.id])
			const canonicalLabel = text(row[source.canonicalLabel])
			const names = rows(row.names)
			const name = source.translationLabel ? text((names.find((item) => item.locale === 'en') ?? names[0])?.[source.translationLabel]) : ''
			return { key: `${source.key}:${id}`, at: text(row.updated_at) || null, source: source.key, noun: source.noun, label: name || canonicalLabel || id, locale: null, href: source.href(id, canonicalLabel) }
		})
	})
	const others = [
		(async () => {
			const { data, error } = await supabase.from('media_assets').select('id, original_filename, object_path, updated_at').order('updated_at', { ascending: false }).limit(limit)
			fail('recent media', error)
			return rows(data).map((row): DashboardItem => ({ key: `media:${text(row.id)}`, at: text(row.updated_at) || null, source: 'media', noun: 'Media file', label: text(row.original_filename) || text(row.object_path).split('/').at(-1) || text(row.id), locale: null, href: `/admin/media?asset=${text(row.id)}` }))
		})(),
		(async () => {
			const { data, error } = await supabase.from('site_settings').select('key, updated_at').order('updated_at', { ascending: false }).limit(limit)
			fail('recent settings', error)
			return rows(data).map((row): DashboardItem => ({ key: `settings:${text(row.key)}`, at: text(row.updated_at) || null, source: 'settings', noun: 'Site setting', label: text(row.key).replace(/_/g, ' '), locale: null, href: '/admin/settings' }))
		})(),
		(async () => {
			const { data, error } = await supabase.from('redirects').select('id, source_path, updated_at').order('updated_at', { ascending: false }).limit(limit)
			fail('recent redirects', error)
			return rows(data).map((row): DashboardItem => ({ key: `redirects:${text(row.id)}`, at: text(row.updated_at) || null, source: 'redirects', noun: 'Redirect', label: text(row.source_path), locale: null, href: '/admin/redirects' }))
		})(),
	]
	const lists = await Promise.all([...translationLists, ...canonicalLists, ...others])
	return mergeRecent(lists, limit)
}

