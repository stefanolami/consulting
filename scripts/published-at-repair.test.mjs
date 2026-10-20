import assert from 'node:assert/strict'
import test from 'node:test'

import { formatRepairReport, planRepairs, PUBLISHED_AT_REPAIRS } from './lib/published-at-repair.mjs'

const glenn = PUBLISHED_AT_REPAIRS.find((item) => item.label.startsWith('Glenn'))

test('a re-stamped row is restored to its recorded original', () => {
	const [item] = planRepairs([glenn], new Map([[glenn.label, { status: 'published', published_at: '2026-10-20T14:31:50.401+00:00' }]]))
	assert.equal(item.action, 'restore')
	assert.equal(item.original, '2025-09-01T00:00:00.000Z')
})

test('running again changes nothing (Postgres returns +00:00)', () => {
	const [item] = planRepairs([glenn], new Map([[glenn.label, { status: 'published', published_at: '2025-09-01T00:00:00+00:00' }]]))
	assert.equal(item.action, 'unchanged')
})

test('a missing row is skipped and the report says dry run', () => {
	const plan = planRepairs(PUBLISHED_AT_REPAIRS, new Map())
	assert.ok(plan.every((item) => item.action === 'missing'))
	const report = formatRepairReport(plan, { applyMode: false })
	assert.match(report, /DRY RUN/)
	assert.match(report, /0 to restore, 0 already correct, 3 missing/)
})

test('every repair has an exact UTC original and a log source', () => {
	for (const item of PUBLISHED_AT_REPAIRS) {
		assert.equal(new Date(item.original).toISOString(), item.original)
		assert.ok(item.source.length > 10)
		assert.ok(Object.keys(item.key).includes('locale'))
	}
})
