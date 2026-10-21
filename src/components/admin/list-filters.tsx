'use client'

import Link from 'next/link'

import { FilterSelect, ListPending, ListToolbar, SearchField, useListQuery } from '@/components/admin/list-controls'
import { COUNTRY_LIST, hasListFilters, NEWSROOM_LIST } from '@/lib/admin-list-query.mjs'

const LANGUAGES = [
	{ value: '', label: 'Any language' },
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'German' },
	{ value: 'it', label: 'Italian' },
	{ value: 'pt-BR', label: 'Portuguese (Brazil)' },
	{ value: 'pt-PT', label: 'Portuguese (Portugal)' },
]

function stateOptions(locale: string) {
	const hasLocale = Boolean(locale)
	const needsLanguage = hasLocale ? '' : ' (choose a language)'
	return [
		{ value: '', label: 'Any state' },
		{ value: 'published', label: 'Published' },
		{ value: 'scheduled', label: 'Scheduled' },
		{ value: 'draft', label: 'Draft' },
		{ value: 'archived', label: 'Archived' },
		{ value: 'not-live', label: locale && locale !== 'en' ? 'Live in English, not in this language' : `Not live${needsLanguage}`, disabled: !hasLocale },
		{ value: 'missing', label: `No translation${needsLanguage}`, disabled: !hasLocale },
	]
}

function ClearFilters({ href, show }: { href: string; show: boolean }) {
	if (!show) return null
	return <Link className="inline-flex h-10 items-center text-sm font-medium text-[#27335a] underline underline-offset-4" href={href} scroll={false}>Clear search and filters</Link>
}

/** Search and filters of the newsroom list (audit NEWS-09); the state lives in the URL. */
export function NewsroomFilters({ kinds }: { kinds: readonly string[] }) {
	const { hrefFor, pending, state, update } = useListQuery(NEWSROOM_LIST, 'server')
	return (
		<ListToolbar>
			<SearchField className="min-w-64" label="Search articles by title or URL slug, in any language" onSearch={(q, options) => update({ q }, options)} placeholder="Search titles and slugs" value={state.q} />
			<FilterSelect label="Language" onChange={(locale) => update({ locale: locale as typeof state.locale })} options={LANGUAGES} value={state.locale} />
			<FilterSelect label="State" onChange={(status) => update({ status: status as typeof state.status })} options={stateOptions(state.locale)} value={state.status} />
			<FilterSelect label="Kind" onChange={(kind) => update({ kind })} options={[{ value: '', label: 'Any kind' }, ...kinds.map((kind) => ({ value: kind, label: kind.charAt(0).toUpperCase() + kind.slice(1) }))]} value={state.kind} />
			<ClearFilters href={hrefFor({ q: '', status: '', locale: '', kind: '' })} show={hasListFilters(NEWSROOM_LIST, state)} />
			<ListPending pending={pending} />
		</ListToolbar>
	)
}

/** Search and filters of the country list (audit OUT-08); the state lives in the URL. */
export function CountryFilters({ regions }: { regions: readonly { id: string; label: string }[] }) {
	const { hrefFor, pending, state, update } = useListQuery(COUNTRY_LIST, 'server')
	return (
		<ListToolbar>
			<SearchField className="min-w-64" label="Search countries by name or URL slug, in any language" onSearch={(q, options) => update({ q }, options)} placeholder="Search country names" value={state.q} />
			<FilterSelect label="Coverage" onChange={(coverage) => update({ coverage: coverage as typeof state.coverage })} options={[{ value: '', label: 'All countries' }, { value: 'covered', label: 'Covered' }, { value: 'not-covered', label: 'Not covered' }]} value={state.coverage} />
			<FilterSelect label="Region" onChange={(region) => update({ region })} options={[{ value: '', label: 'Any region' }, ...regions.map((region) => ({ value: region.id, label: region.label })), { value: 'none', label: 'No region' }]} value={state.region} />
			<FilterSelect label="Language" onChange={(locale) => update({ locale: locale as typeof state.locale })} options={LANGUAGES} value={state.locale} />
			<FilterSelect label="State" onChange={(status) => update({ status: status as typeof state.status })} options={stateOptions(state.locale)} value={state.status} />
			<ClearFilters href={hrefFor({ q: '', coverage: '', region: '', status: '', locale: '' })} show={hasListFilters(COUNTRY_LIST, state)} />
			<ListPending pending={pending} />
		</ListToolbar>
	)
}
