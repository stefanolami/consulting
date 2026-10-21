import assert from 'node:assert/strict'
import test from 'node:test'

import { parkedMetricKey, postgrestInList, relationWritePlan, statisticWritePlan } from '../src/lib/relation-writes.mjs'

test('in lists quote only the values PostgREST would split', () => {
	assert.equal(postgrestInList(['3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1', 'population']), '(3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1,population)')
	assert.equal(postgrestInList(['a,b', 'say "hi"', 'x.y']), '("a,b","say \\"hi\\"","x.y")')
	assert.equal(postgrestInList([]), '()')
})

test('a relation is replaced by upserting the chosen rows first, then deleting the others', () => {
	const rows = [{ article_id: 'a', person_id: 'p2', display_order: 0 }, { article_id: 'a', person_id: 'p1', display_order: 1 }]
	assert.deepEqual(relationWritePlan(rows, 'person_id'), { upsert: rows, keep: ['p2', 'p1'] })
	assert.deepEqual(relationWritePlan([], 'person_id'), { upsert: [], keep: null })
	assert.throws(() => relationWritePlan([{ person_id: 'p1' }, { person_id: 'p1' }], 'person_id'), /Duplicate person_id/)
})

const stored = [{ id: 's1', metricKey: 'population' }, { id: 's2', metricKey: 'gdp' }, { id: 's3', metricKey: 'offices' }]

test('renaming a metric key updates the statistic instead of deleting it (OUT-10)', () => {
	const plan = statisticWritePlan(stored, [{ id: 's1', metricKey: 'inhabitants' }, { id: 's2', metricKey: 'gdp' }, { id: 's3', metricKey: 'offices' }])
	assert.deepEqual(plan.remove, [])
	assert.deepEqual(plan.parked, [])
	assert.deepEqual(plan.insert, [])
	assert.deepEqual(plan.update.map((row) => [row.id, row.metricKey]), [['s1', 'inhabitants'], ['s2', 'gdp'], ['s3', 'offices']])
})

test('removed rows are deleted, new rows inserted, and a new row may reuse a removed or renamed key', () => {
	const plan = statisticWritePlan(stored, [{ id: 's1', metricKey: 'residents' }, { metricKey: 'population' }, { metricKey: 'gdp' }])
	assert.deepEqual(plan.remove, ['s2', 's3'])
	assert.deepEqual(plan.insert.map((row) => row.metricKey), ['population', 'gdp'])
	assert.deepEqual(plan.parked, [])
})

test('a swap or a chain of renames parks the rows whose new key is still held', () => {
	const swap = statisticWritePlan(stored, [{ id: 's1', metricKey: 'gdp' }, { id: 's2', metricKey: 'population' }, { id: 's3', metricKey: 'offices' }])
	assert.deepEqual(swap.parked.sort(), ['s1', 's2'])
	assert.deepEqual(swap.update.map((row) => row.id), ['s3', 's1', 's2'])
	// population → gdp while gdp → growth: gdp is free once s2 is updated, so s1 waits for it.
	const chain = statisticWritePlan(stored, [{ id: 's1', metricKey: 'gdp' }, { id: 's2', metricKey: 'growth' }, { id: 's3', metricKey: 'offices' }])
	assert.deepEqual(chain.parked, ['s1'])
	assert.deepEqual(chain.update.map((row) => row.id), ['s2', 's3', 's1'])
})

test('a key freed by a removal needs no parking', () => {
	const plan = statisticWritePlan(stored, [{ id: 's1', metricKey: 'gdp' }])
	assert.deepEqual(plan.remove, ['s2', 's3'])
	assert.deepEqual(plan.parked, [])
})

test('ids that are not stored for the country are reported', () => {
	assert.deepEqual(statisticWritePlan(stored, [{ id: 'other', metricKey: 'x' }]).unknown, ['other'])
})

test('a parked key passes the metric key check', () => {
	const key = parkedMetricKey('6C206A84-D42A-4571-B24A-15BB52A5C42C')
	assert.match(key, /^[a-z0-9]+(-[a-z0-9]+)*$/)
	assert.equal(key, 'renaming-6c206a84-d42a-4571-b24a-15bb52a5c42c')
})
