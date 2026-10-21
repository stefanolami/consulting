import 'server-only'

import { FieldError } from '@/lib/admin-action'
import { postgrestInList, relationWritePlan } from '@/lib/relation-writes.mjs'
import type { createClient } from '@/lib/supabase/server'

/*
 * Multi-step admin writes (audit X-13, slice 5b). PostgREST runs every
 * request in its own transaction and there are no database functions for
 * these saves, so they are ordered to fail safely (src/lib/relation-writes.mjs):
 * - creates check stable keys and slugs before the first write, and a step
 *   that fails after the canonical row exists deletes that row again, so a
 *   retry starts clean (deleting needs the admin role; for an editor the
 *   message says what was left);
 * - relation lists upsert the chosen rows first and delete the others last,
 *   so a failure never empties a list.
 * The generated types cannot follow a table name chosen at run time, so these
 * go through the small `Writable` shape below.
 */

type Client = Awaited<ReturnType<typeof createClient>>
type Row = Record<string, unknown>
type Result = { data?: unknown; error: { message: string } | null }
type Filter = PromiseLike<Result> & { eq(column: string, value: unknown): Filter; not(column: string, operator: string, value: string): Filter; select(columns: string): Filter }
type Writable = {
	from(table: string): {
		select(columns: string): Filter
		upsert(rows: Row[], options: { onConflict: string }): PromiseLike<Result>
		delete(): Filter
	}
}

function writable(supabase: Client) {
	return supabase as unknown as Writable
}

function scoped(filter: Filter, scope: Row) {
	return Object.entries(scope).reduce((current, [column, value]) => current.eq(column, value), filter)
}

/**
 * Refuses a value that another record already uses (a stable key, or a slug
 * in one locale), on the field that holds it, before anything is written.
 */
export async function requireUnused(supabase: Client, { column, except, field, label, scope = {}, table, value }: { column: string; except?: { column: string; value: string }; field: string; label: string; scope?: Row; table: string; value: string }) {
	const query = scoped(writable(supabase).from(table).select(column), scope).eq(column, value)
	const { data, error } = await (except ? query.not(except.column, 'eq', except.value) : query)
	if (error) throw new Error(`Could not check the ${label}: ${error.message}`)
	if (Array.isArray(data) && data.length) throw new FieldError(field, `That ${label} is already in use. Choose another.`)
}

/**
 * Replaces the relation rows that belong to `owner` (for example
 * `{ article_id }`) with `rows`, identified by `key`: the chosen rows are
 * upserted on `onConflict` (the table's primary key), then the rows no longer
 * chosen are deleted.
 */
export async function replaceRelation(supabase: Client, { key, label, onConflict, owner, rows, table }: { key: string; label: string; onConflict: string; owner: Row; rows: Row[]; table: string }) {
	const plan = relationWritePlan(rows, key)
	const client = writable(supabase)
	if (plan.upsert.length) {
		const { error } = await client.from(table).upsert([...plan.upsert], { onConflict })
		if (error) throw new Error(`Could not save ${label}: ${error.message}`)
	}
	const remove = scoped(client.from(table).delete(), owner)
	const { error } = await (plan.keep ? remove.not(key, 'in', postgrestInList(plan.keep.map(String))) : remove)
	if (error) throw new Error(`Could not remove the ${label} that are no longer chosen: ${error.message}. The new choices are saved; save again to remove the others.`)
}

/**
 * Runs the steps of a create that follow the insert of its canonical row.
 * When one fails, the row is deleted again (its translations and relations
 * go with it through the foreign keys) and the step's error is reported.
 */
export async function completeCreate<T>(supabase: Client, { column = 'id', table, id, what }: { column?: string; table: string; id: string; what: string }, steps: () => Promise<T>): Promise<T> {
	try {
		return await steps()
	} catch (error) {
		const { data, error: deleteError } = await writable(supabase).from(table).delete().eq(column, id).select(column)
		const removed = !deleteError && Array.isArray(data) && data.length > 0
		const reason = error instanceof Error ? error.message : String(error)
		if (removed) {
			if (error instanceof FieldError) throw new FieldError(error.field, `${reason} Nothing was created.`)
			throw new Error(`${reason} Nothing was created; try again.`)
		}
		throw new Error(`${reason} The ${what} was created without it and could not be removed again (that needs an administrator): open it from the list to finish it.`)
	}
}
