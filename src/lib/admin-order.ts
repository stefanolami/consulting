import 'server-only'

import { looseClient, rows, text } from '@/lib/admin-query'
import { moveInDisplayOrder, nextDisplayOrder } from '@/lib/display-order.mjs'

/*
 * Display order writes for the admin's ordered lists (audit PPL-07, PPL-09,
 * PAR-06): the rules live in display-order.mjs; these read the list and
 * write the result. `scope` narrows the list (People order within a team
 * group); `tieBreak` is the column the list and the public pages sort equal
 * orders by.
 */

type OrderedTable = 'people' | 'services' | 'sectors' | 'partners' | 'endorsements' | 'regions' | 'offices' | 'tags'
type ListOptions = { table: OrderedTable; tieBreak: string; scope?: Record<string, unknown> }

/** The order for a new record: after the last one in its list. */
export async function endOfListOrder({ table, scope = {} }: Omit<ListOptions, 'tieBreak'>) {
	const supabase = await looseClient()
	const query = Object.entries(scope).reduce((current, [column, value]) => current.eq(column, value), supabase.from(table).select('display_order'))
	const { data, error } = await query.order('display_order', { ascending: false }).limit(1)
	if (error) throw new Error(`Could not read the current order: ${error.message}`)
	const highest = rows(data)[0]?.display_order
	return nextDisplayOrder(typeof highest === 'number' ? highest : null)
}

/**
 * Moves one record up or down among the active records of its list and
 * writes the orders that change. Returns false when the record cannot move
 * (archived, already first or last, or not in the list).
 */
export async function moveRecord({ direction, id, profileId, scope = {}, table, tieBreak }: ListOptions & { direction: 'up' | 'down'; id: string; profileId: string }) {
	const supabase = await looseClient()
	const query = Object.entries(scope).reduce((current, [column, value]) => current.eq(column, value), supabase.from(table).select(`id, display_order, is_active, ${tieBreak}`))
	const { data, error } = await query.order('display_order').order(tieBreak).order('id')
	if (error) throw new Error(`Could not load the current order: ${error.message}`)
	const list = rows(data).map((row) => ({ id: text(row.id), order: Number(row.display_order ?? 0), tieBreak: text(row[tieBreak]), isActive: row.is_active === true }))
	const { moved, updates } = moveInDisplayOrder(list, id, direction, (row) => row.isActive)
	if (!moved) return false
	const results = await Promise.all(updates.map((update) => supabase.from(table).update({ display_order: update.order, updated_by: profileId }).eq('id', update.id)))
	const failure = results.find((result) => result.error)?.error
	if (failure) throw new Error(`Could not save the order: ${failure.message}`)
	return true
}
