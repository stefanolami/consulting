import assert from 'node:assert/strict'
import test from 'node:test'

import { countryDetailBlocks, hasVisibleText, longestWordLength, reviewedDate, statisticSource, statisticText } from '../src/lib/outreach/outreach-detail.mjs'

const statistic = (fields = {}) => ({ displayValue: null, id: 's1', label: 'Population', metricKey: 'population', numericValue: 19.05, sourceUrl: null, unit: 'million', year: 2024, ...fields })
const doc = (text) => ({ content: text === null ? [] : [{ content: [{ text, type: 'text' }], type: 'paragraph' }], type: 'doc' })
const service = (fields = {}) => ({ content: doc(null), coverageLevel: null, icon: null, id: 'v1', name: 'Public Funds', slug: 'public-funds', summary: null, ...fields })
const country = (fields = {}) => ({
	content: doc(null),
	coverageSummary: null,
	lastReviewedOn: null,
	offices: [],
	people: [],
	services: [],
	statistics: [],
	summary: null,
	...fields,
})

test('statistics read as number, unit and year in the locale', () => {
	assert.equal(statisticText(statistic(), 'en'), '19.05 million (2024)')
	assert.equal(statisticText(statistic(), 'de'), '19,05 million (2024)')
	assert.equal(statisticText(statistic({ numericValue: 1234567, unit: null, year: null }), 'en'), '1,234,567')
	assert.equal(statisticText(statistic({ numericValue: '3' }), 'en'), '3 million (2024)', 'numeric columns may arrive as strings')
})

test('the display value replaces the number and unit, and keeps the year', () => {
	assert.equal(statisticText(statistic({ displayValue: 'about 19 million' }), 'en'), 'about 19 million (2024)')
	assert.equal(statisticText(statistic({ displayValue: 'Rio de Janeiro, São Paulo', numericValue: null, year: null }), 'en'), 'Rio de Janeiro, São Paulo')
	assert.equal(statisticText(statistic({ displayValue: '  ', numericValue: null }), 'en'), null, 'nothing to show')
})

test('statistic sources link only to http(s) and show the host name', () => {
	assert.deepEqual(statisticSource('https://www.worldbank.org/en/country'), { host: 'worldbank.org', href: 'https://www.worldbank.org/en/country' })
	assert.equal(statisticSource('javascript:alert(1)'), null)
	assert.equal(statisticSource('not a url'), null)
	assert.equal(statisticSource(null), null)
})

test('review dates are calendar dates without a time zone shift', () => {
	assert.equal(reviewedDate('2024-11-17').toISOString(), '2024-11-17T00:00:00.000Z')
	assert.equal(reviewedDate('2024-02-30'), null)
	assert.equal(reviewedDate('17/11/2024'), null)
	assert.equal(reviewedDate(null), null)
})

test('rich text counts as content only when it has visible text', () => {
	assert.equal(hasVisibleText(doc('Hello')), true)
	assert.equal(hasVisibleText(doc('   ')), false)
	assert.equal(hasVisibleText(doc(null)), false)
	assert.equal(hasVisibleText(null), false)
})

test('a sparse country renders no block', () => {
	assert.deepEqual(countryDetailBlocks(country({ coverageSummary: '', summary: '  ' }), 'en'), {
		content: false,
		coverage: null,
		lastReviewed: null,
		offices: [],
		people: [],
		serviceDetails: [],
		services: [],
		statistics: [],
		summary: null,
	})
})

test('blocks keep only what has published content', () => {
	const person = { email: null, id: 'p1', name: 'Glenn', phone: null, portrait: null, profileSlug: 'glenn', relationship: 'expert', role: null }
	const blocks = countryDetailBlocks(country({
		content: doc('Body'),
		coverageSummary: ' From our Rio office. ',
		lastReviewedOn: '2026-09-03',
		people: [person, { ...person, relationship: 'contact' }],
		services: [service(), service({ id: 'v2', summary: 'In Brazil' }), service({ content: doc('Copy'), id: 'v3' })],
		statistics: [statistic(), statistic({ id: 's2', label: ' ' }), statistic({ id: 's3', numericValue: null })],
		summary: 'Summary',
	}), 'en')
	assert.equal(blocks.content, true)
	assert.equal(blocks.coverage, 'From our Rio office.')
	assert.equal(blocks.lastReviewed.toISOString().slice(0, 10), '2026-09-03')
	assert.deepEqual(blocks.people.map((item) => item.relationship), ['expert'], 'a person with two relationships is listed once')
	assert.deepEqual(blocks.services.map((item) => item.id), ['v1', 'v2', 'v3'])
	assert.deepEqual(blocks.serviceDetails.map((item) => item.id), ['v2', 'v3'], 'service copy only when the country has its own')
	assert.deepEqual(blocks.statistics, [{ id: 's1', label: 'Population', metricKey: 'population', source: null, text: '19.05 million (2024)' }], 'unlabelled and empty statistics are dropped')
	assert.equal(blocks.summary, 'Summary')
})

test('service circles are sized for the longest word of any name', () => {
	assert.equal(longestWordLength(['Government Relations', 'Visibility & Communications']), 14)
	assert.equal(longestWordLength(['Öffentlichkeitsarbeit']), 21)
	assert.equal(longestWordLength([]), 0)
})
