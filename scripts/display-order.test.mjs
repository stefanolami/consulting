import assert from 'node:assert/strict'
import test from 'node:test'

import { compareDisplayOrder, moveAvailability, moveInDisplayOrder, nextDisplayOrder, sortByDisplayOrder } from '../src/lib/display-order.mjs'

const row = (id, order, tieBreak = id, isActive = true) => ({ id, order, tieBreak, isActive })
const active = (item) => item.isActive

test('a new record goes after the highest order in use', () => {
	assert.equal(nextDisplayOrder(null), 0)
	assert.equal(nextDisplayOrder(undefined), 0)
	assert.equal(nextDisplayOrder(0), 1)
	assert.equal(nextDisplayOrder(7), 8)
	assert.equal(nextDisplayOrder(-3), 0)
	assert.equal(nextDisplayOrder(Number.NaN), 0)
})

test('rows sharing an order are listed by tie-break text, then id, whatever their input order', () => {
	const rows = [row('c', 0, 'EFFA'), row('b', 0, 'adv'), row('a', 1, 'AIJN'), row('d', 0, 'adv')]
	assert.deepEqual(sortByDisplayOrder(rows).map((item) => item.id), ['b', 'd', 'c', 'a'])
	assert.deepEqual(sortByDisplayOrder([...rows].reverse()).map((item) => item.id), ['b', 'd', 'c', 'a'])
	assert.equal(compareDisplayOrder(row('x', 2, 'Same'), row('x', 2, 'same')), 0)
})

test('moving swaps with the neighbour and writes only the rows whose order changes', () => {
	const rows = [row('a', 0), row('b', 1), row('c', 2), row('d', 3)]
	assert.deepEqual(moveInDisplayOrder(rows, 'c', 'up'), { moved: true, updates: [{ id: 'c', order: 1 }, { id: 'b', order: 2 }] })
	assert.deepEqual(moveInDisplayOrder(rows, 'a', 'down'), { moved: true, updates: [{ id: 'b', order: 0 }, { id: 'a', order: 1 }] })
})

test('the first row cannot move up and the last cannot move down', () => {
	const rows = [row('a', 0), row('b', 1)]
	assert.deepEqual(moveInDisplayOrder(rows, 'a', 'up'), { moved: false, updates: [] })
	assert.deepEqual(moveInDisplayOrder(rows, 'b', 'down'), { moved: false, updates: [] })
	assert.deepEqual(moveInDisplayOrder(rows, 'missing', 'down'), { moved: false, updates: [] })
})

test('duplicate orders are resolved by the first move: the list is renumbered in its listed order', () => {
	// ADV and EFFA both 0 (PAR-06); listed ADV, EFFA, AIJN.
	const rows = [row('effa', 0, 'EFFA'), row('adv', 0, 'ADV'), row('aijn', 0, 'AIJN')]
	const result = moveInDisplayOrder(rows, 'effa', 'up')
	assert.equal(result.moved, true)
	// ADV, AIJN, EFFA by name → EFFA swaps with AIJN: ADV 0, EFFA 1, AIJN 2.
	assert.deepEqual(result.updates, [{ id: 'effa', order: 1 }, { id: 'aijn', order: 2 }])
})

test('archived rows neither move nor take a turn (PPL-09)', () => {
	const rows = [row('a', 0), row('archived', 1, 'archived', false), row('c', 2)]
	assert.deepEqual(moveInDisplayOrder(rows, 'archived', 'up', active), { moved: false, updates: [] })
	// c skips the archived row and swaps with a; the archived row keeps its place.
	assert.deepEqual(moveInDisplayOrder(rows, 'c', 'up', active), { moved: true, updates: [{ id: 'c', order: 0 }, { id: 'a', order: 2 }] })
	// With only archived rows above, an active row is already first.
	assert.deepEqual(moveInDisplayOrder([row('x', 0, 'x', false), row('y', 1)], 'y', 'up', active), { moved: false, updates: [] })
})

test('move availability follows the movable rows only', () => {
	const rows = [row('archived', 0, 'archived', false), row('a', 1), row('b', 2), row('c', 3)]
	const availability = moveAvailability(rows, active)
	assert.deepEqual(availability.get('archived'), { up: false, down: false })
	assert.deepEqual(availability.get('a'), { up: false, down: true })
	assert.deepEqual(availability.get('b'), { up: true, down: true })
	assert.deepEqual(availability.get('c'), { up: true, down: false })
	assert.deepEqual(moveAvailability([row('only', 0)]).get('only'), { up: false, down: false })
})
