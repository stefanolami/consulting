import assert from 'node:assert/strict'
import test from 'node:test'

import {
	closeCountryView,
	countryView,
	outreachSearch,
	parseOutreachParams,
	regionToggleView,
	resolveOutreachView,
	sameView,
	WORLD_VIEW,
} from '../src/lib/outreach/outreach-state.mjs'

const regions = [
	{ countryCodes: ['FR', 'RO'], key: 'europe' },
	{ countryCodes: ['BR'], key: 'latin-america-caribbean' },
	{ countryCodes: [], key: 'oceania' },
]
const params = (query) => parseOutreachParams(new URLSearchParams(query))

test('parameters are normalised and malformed values dropped', () => {
	assert.deepEqual(params('region=Europe&country=ro'), { country: 'RO', region: 'europe' })
	assert.deepEqual(params('region=%20latin-america-caribbean%20'), { country: null, region: 'latin-america-caribbean' })
	assert.deepEqual(params('region=eu_rope&country=ROU'), { country: null, region: null })
	assert.deepEqual(params('country=1A&region=-europe'), { country: null, region: null })
	assert.deepEqual(params(''), { country: null, region: null })
	assert.deepEqual(parseOutreachParams(null), { country: null, region: null })
})

test('a known country brings its region and wins over a disagreeing region', () => {
	assert.deepEqual(resolveOutreachView(params('country=ro'), regions), { country: 'RO', region: 'europe' })
	assert.deepEqual(resolveOutreachView(params('region=latin-america-caribbean&country=RO'), regions), { country: 'RO', region: 'europe' })
})

test('unknown or unpublished values fall back to the region, then the world', () => {
	assert.deepEqual(resolveOutreachView(params('region=europe&country=DE'), regions), { country: null, region: 'europe' })
	assert.deepEqual(resolveOutreachView(params('region=antarctica'), regions), WORLD_VIEW)
	assert.deepEqual(resolveOutreachView(params('country=DE'), regions), WORLD_VIEW)
	assert.deepEqual(resolveOutreachView(params('region=oceania'), regions), { country: null, region: 'oceania' })
})

test('generated URLs never carry both parameters', () => {
	assert.equal(outreachSearch(WORLD_VIEW), '')
	assert.equal(outreachSearch({ country: null, region: 'europe' }), '?region=europe')
	assert.equal(outreachSearch({ country: 'RO', region: 'europe' }), '?country=RO')
})

test('choosing the open region returns to the world; closing a country keeps its region', () => {
	assert.deepEqual(regionToggleView(WORLD_VIEW, 'europe'), { country: null, region: 'europe' })
	assert.deepEqual(regionToggleView({ country: null, region: 'europe' }, 'europe'), WORLD_VIEW)
	assert.deepEqual(regionToggleView({ country: 'RO', region: 'europe' }, 'europe'), WORLD_VIEW)
	assert.deepEqual(regionToggleView({ country: 'RO', region: 'europe' }, 'oceania'), { country: null, region: 'oceania' })
	assert.deepEqual(closeCountryView(countryView('europe', 'RO')), { country: null, region: 'europe' })
})

test('a view round-trips through its URL', () => {
	for (const view of [WORLD_VIEW, { country: null, region: 'oceania' }, countryView('europe', 'FR')]) {
		const restored = resolveOutreachView(params(outreachSearch(view).slice(1)), regions)
		assert.ok(sameView(restored, view), JSON.stringify(view))
	}
})
