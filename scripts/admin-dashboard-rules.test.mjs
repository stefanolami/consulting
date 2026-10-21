import assert from 'node:assert/strict'
import test from 'node:test'

import { altTextGaps, mergeRecent, mergeSoonest, scheduleWindow, total } from '../src/lib/admin-dashboard-rules.mjs'

test('the schedule window starts now and looks 14 days ahead', () => {
	assert.deepEqual(scheduleWindow(new Date('2026-10-21T10:00:00.000Z')), { from: '2026-10-21T10:00:00.000Z', to: '2026-11-04T10:00:00.000Z' })
	assert.deepEqual(scheduleWindow(new Date('2026-10-21T10:00:00.000Z'), 1), { from: '2026-10-21T10:00:00.000Z', to: '2026-10-22T10:00:00.000Z' })
})

test('recent items are newest first, one per record, capped', () => {
	const translations = [{ key: 'people:1', at: '2026-10-21T09:00:00Z', label: 'Flávia (en)' }, { key: 'service:2', at: '2026-10-20T09:00:00Z', label: 'Energy (de)' }]
	const canonical = [{ key: 'people:1', at: '2026-10-21T08:00:00Z', label: 'Flávia' }, { key: 'article:3', at: '2026-10-21T10:00:00Z', label: 'Hiring' }]
	assert.deepEqual(mergeRecent([translations, canonical]).map((item) => item.label), ['Hiring', 'Flávia (en)', 'Energy (de)'])
	assert.deepEqual(mergeRecent([translations, canonical], 2).map((item) => item.key), ['article:3', 'people:1'])
	assert.deepEqual(mergeRecent([[{ key: 'x', at: null }], [{ key: 'y', at: '2026-01-01T00:00:00Z' }]]).map((item) => item.key), ['y', 'x'])
})

test('scheduled items are soonest first', () => {
	const merged = mergeSoonest([[{ at: '2026-10-25T00:00:00Z', id: 'b' }], [{ at: '2026-10-22T00:00:00Z', id: 'a' }, { at: '2026-11-01T00:00:00Z', id: 'c' }]], 2)
	assert.deepEqual(merged.map((item) => item.id), ['a', 'b'])
})

test('alt text gaps list only live languages without any description, in locale order', () => {
	const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT']
	const uses = [
		{ id: 'icon', liveLocales: ['de', 'en', 'it'], libraryAlts: { en: 'Energy icon', de: '  ', it: null } },
		{ id: 'complete', liveLocales: ['en'], libraryAlts: { en: 'Portrait' } },
		// A partner's own alt text covers its logo in that language.
		{ id: 'logo', liveLocales: ['en', 'pt-PT'], libraryAlts: {}, useAlts: { en: 'ADV logo' } },
		{ id: 'not-live', liveLocales: [], libraryAlts: {} },
	]
	assert.deepEqual(altTextGaps(uses, locales).map(({ id, missing }) => ({ id, missing })), [
		{ id: 'icon', missing: ['de', 'it'] },
		{ id: 'logo', missing: ['pt-PT'] },
	])
	assert.deepEqual(altTextGaps([{ liveLocales: ['en', 'en'], libraryAlts: {} }], locales)[0].missing, ['en'])
})

test('totals ignore missing counts', () => {
	assert.equal(total([1, 2, null, undefined, 3]), 6)
	assert.equal(total([]), 0)
})
