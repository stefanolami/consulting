// Write plans for the admin's multi-step saves (audit X-13, OUT-10, slice 5b).
// PostgREST runs each request in its own transaction, so a save that writes
// several tables cannot be made atomic without database functions. These
// plans order the requests so that a failure part-way leaves the previous
// content, or the previous content plus the new choices, but never an empty
// or truncated list:
// - a relation list is replaced by upserting the chosen rows first and then
//   deleting the rows that are no longer chosen (relationWritePlan);
// - country statistics keep their ids, so a renamed metric key updates the
//   row (and keeps its labels) instead of deleting it (statisticWritePlan).
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

// Characters that end or split a value in a PostgREST `in.(…)` list.
const RESERVED = /[,()"\\:.\s]/

/** A PostgREST `in` list, `(a,b)`, quoting the values that need it. */
export function postgrestInList(values) {
	return `(${values.map((value) => {
		const text = String(value)
		return RESERVED.test(text) ? `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : text
	}).join(',')})`
}

/**
 * The requests that replace the relation rows of one owner with `rows`, in
 * order: the rows to upsert (the chosen ones, with their new order), then
 * whether and which keys to keep when deleting. `keep` is null when every
 * row of the owner is deleted (nothing is chosen any more).
 */
export function relationWritePlan(rows, key) {
	const keys = rows.map((row) => row[key])
	if (new Set(keys).size !== keys.length) throw new Error(`Duplicate ${key} in the relation rows.`)
	return { upsert: rows, keep: keys.length ? keys : null }
}

/**
 * The writes that turn the stored statistics of a country (`existing`, rows
 * `{ id, metricKey }`) into `desired` (form rows; a stored one has its `id`):
 * - `remove`: ids of stored rows that are no longer in the form;
 * - `parked`: ids whose metric key moves to a key another kept row still
 *   holds (a swap or a chain of renames); they first get a temporary key, so
 *   the unique (country, metric key) constraint holds after every request;
 * - `update`: the stored rows that stay, with their new values, the parked
 *   ones last (their final keys are free once the others are updated);
 * - `insert`: the new rows.
 * Run them in that order: remove, park, update, insert. Labels hang off the
 * statistic id, so a renamed key keeps them.
 * `unknown` lists ids the form sent that are not stored for this country
 * (removed elsewhere since the page loaded); the caller refuses the save.
 */
export function statisticWritePlan(existing, desired) {
	const stored = new Map(existing.map((row) => [row.id, row]))
	const unknown = desired.flatMap((row) => row.id && !stored.has(row.id) ? [row.id] : [])
	const update = desired.filter((row) => row.id && stored.has(row.id))
	const insert = desired.filter((row) => !row.id)
	const keptIds = new Set(update.map((row) => row.id))
	const remove = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id)
	// Keys held after the removals, before any update.
	const heldBy = new Map(existing.filter((row) => keptIds.has(row.id)).map((row) => [row.metricKey, row.id]))
	const parked = update.filter((row) => {
		const holder = heldBy.get(row.metricKey)
		return holder !== undefined && holder !== row.id
	}).map((row) => row.id)
	const ordered = [...update.filter((row) => !parked.includes(row.id)), ...update.filter((row) => parked.includes(row.id))]
	return { insert, parked, remove, unknown, update: ordered }
}

/** A temporary metric key for a parked statistic (valid for the metric key check). */
export function parkedMetricKey(id) {
	return `renaming-${String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
}
