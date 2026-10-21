// Display order of admin lists (audit PPL-07, PPL-09, PAR-06, slice 5a):
// - a new record goes to the end of its list, one past the highest order in
//   use, instead of order 0 (which put it first);
// - rows that share an order are always listed the same way: by order, then
//   by the list's tie-break text (the name or stable key the public readers
//   also sort by), then by id;
// - moving a row swaps it with the nearest row that may move (active rows
//   only, so archived rows neither move nor take a turn), renumbers the whole
//   list 0, 1, 2… in that order, and reports only the rows whose order
//   changed, so duplicate orders are resolved on the first move.
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

/** The order for a record added at the end of a list whose highest order is `highest` (null or undefined for an empty list). */
export function nextDisplayOrder(highest) {
	return typeof highest === 'number' && Number.isFinite(highest) ? Math.max(0, Math.floor(highest) + 1) : 0
}

/** Compares two rows `{ id, order, tieBreak }` in list order. */
export function compareDisplayOrder(a, b) {
	if (a.order !== b.order) return a.order - b.order
	const text = (a.tieBreak ?? '').localeCompare(b.tieBreak ?? '', 'en', { sensitivity: 'base' })
	if (text !== 0) return text
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** The rows in list order (a sorted copy). */
export function sortByDisplayOrder(rows) {
	return [...rows].sort(compareDisplayOrder)
}

/**
 * Moves the row `id` one place `up` or `down` among the rows for which
 * `canMove(row)` is true. Returns `{ moved, updates }`: `updates` lists
 * `{ id, order }` for every row whose order changes (the moved pair, plus any
 * row renumbered to remove a duplicate or a gap). `moved` is false, with no
 * updates, when the row is missing, cannot move, or is already first or last.
 */
export function moveInDisplayOrder(rows, id, direction, canMove = () => true) {
	const sorted = sortByDisplayOrder(rows)
	const from = sorted.findIndex((row) => row.id === id)
	if (from < 0 || !canMove(sorted[from])) return { moved: false, updates: [] }
	const step = direction === 'up' ? -1 : 1
	let to = from + step
	while (to >= 0 && to < sorted.length && !canMove(sorted[to])) to += step
	if (to < 0 || to >= sorted.length) return { moved: false, updates: [] }
	;[sorted[from], sorted[to]] = [sorted[to], sorted[from]]
	const updates = sorted.flatMap((row, order) => row.order === order ? [] : [{ id: row.id, order }])
	return { moved: true, updates }
}

/**
 * For each row id, whether it can move up and down: false for rows that
 * cannot move, for the first movable row (up) and for the last (down).
 */
export function moveAvailability(rows, canMove = () => true) {
	const movable = sortByDisplayOrder(rows).filter(canMove)
	const result = new Map()
	for (const row of rows) result.set(row.id, { up: false, down: false })
	movable.forEach((row, index) => result.set(row.id, { up: index > 0, down: index < movable.length - 1 }))
	return result
}
