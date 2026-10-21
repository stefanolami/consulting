import 'server-only'

import { createClient } from '@/lib/supabase/server'

/*
 * Admin read queries whose select depends on the request: the dashboard's
 * ten content types, and list filters that add or leave out embedded
 * resources. The generated types cannot follow a select string built at run
 * time, so these queries go through the small `Query` shape below and rows
 * are checked by the readers that follow.
 */

export type Row = Record<string, unknown>
type Result = { data: unknown; count: number | null; error: { message: string } | null }
export type Query = PromiseLike<Result> & {
	eq(column: string, value: unknown): Query
	ilike(column: string, pattern: string): Query
	is(column: string, value: null): Query
	not(column: string, operator: string, value: unknown): Query
	or(filters: string, options?: { referencedTable?: string }): Query
	order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string }): Query
	limit(count: number, options?: { referencedTable?: string }): Query
	range(from: number, to: number): Query
}
type Update = { eq(column: string, value: unknown): PromiseLike<{ error: { message: string } | null }> }
export type Loose = { from(table: string): { select(columns: string, options?: { count?: 'exact'; head?: boolean }): Query; update(values: Row): Update } }

/** The request's staff client, for queries built at run time. */
export async function looseClient(): Promise<Loose> {
	return (await createClient()) as unknown as Loose
}

export function text(value: unknown) {
	return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
}

/** An embedded to-one resource (or the first of a list) as a row. */
export function record(value: unknown): Row {
	const item = Array.isArray(value) ? value[0] : value
	return item && typeof item === 'object' ? item as Row : {}
}

/** An embedded to-many resource, or `data`, as rows. */
export function rows(value: unknown): Row[] {
	return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object') : []
}

export function failIf(what: string, error: { message: string } | null) {
	if (error) throw new Error(`Could not load ${what}: ${error.message}`)
}

/** For `or(…, { referencedTable })`: published rows that are live now (a future `published_at` is a schedule). */
export function liveNow(now: string) {
	return `published_at.is.null,published_at.lte."${now}"`
}

/**
 * Applies a translation-state filter to the embedded translations `alias`
 * (one locale, or any when `locale` is empty), as the admin shows states:
 * scheduled is a published row with a future date, or a legacy 'scheduled'
 * row. 'missing' is handled by the caller (an anti-join).
 */
export function whereState(query: Query, alias: string, state: 'draft' | 'scheduled' | 'published' | 'archived', now: string) {
	if (state === 'draft' || state === 'archived') return query.eq(`${alias}.status`, state)
	if (state === 'published') return query.eq(`${alias}.status`, 'published').or(liveNow(now), { referencedTable: alias })
	return query.or(`and(status.eq.published,published_at.gt."${now}"),status.eq.scheduled`, { referencedTable: alias })
}
