import assert from 'node:assert/strict'
import test from 'node:test'

import { CATALOGUE_LIST, changeListQuery, containsPattern, COUNTRY_LIST, hasListFilters, listQueryString, NEWSROOM_LIST, normalizeSearch, pageWindow, parseListQuery } from '../src/lib/admin-list-query.mjs'

test('an empty URL gives every default', () => {
	assert.deepEqual(parseListQuery(NEWSROOM_LIST, new URLSearchParams()), { q: '', status: '', locale: '', kind: '', page: 1 })
	assert.deepEqual(parseListQuery(CATALOGUE_LIST, {}), { kind: 'services', q: '' })
	assert.deepEqual(parseListQuery(COUNTRY_LIST, undefined), { q: '', coverage: 'covered', region: '', status: '', locale: '', page: 1 })
})

test('the country list starts on covered countries; “all” is a filter of its own', () => {
	assert.equal(listQueryString(COUNTRY_LIST, parseListQuery(COUNTRY_LIST, {})), '')
	assert.equal(parseListQuery(COUNTRY_LIST, { coverage: 'all' }).coverage, 'all')
	assert.equal(parseListQuery(COUNTRY_LIST, { coverage: 'everything' }).coverage, 'covered')
	const all = changeListQuery(COUNTRY_LIST, parseListQuery(COUNTRY_LIST, {}), { coverage: 'all' })
	assert.equal(listQueryString(COUNTRY_LIST, all), '?coverage=all')
	assert.equal(hasListFilters(COUNTRY_LIST, all), true)
	// Clearing the filters returns to the covered countries.
	assert.equal(changeListQuery(COUNTRY_LIST, all, { coverage: '' }).coverage, 'covered')
})

test('valid values are read from URLSearchParams and from a Next.js searchParams object', () => {
	const expected = { q: 'eu latam', status: 'draft', locale: 'pt-BR', kind: 'newsletter', page: 3 }
	assert.deepEqual(parseListQuery(NEWSROOM_LIST, new URLSearchParams('q=eu+latam&status=draft&locale=pt-BR&kind=newsletter&page=3')), expected)
	assert.deepEqual(parseListQuery(NEWSROOM_LIST, { q: ['eu latam', 'ignored'], status: 'draft', locale: 'pt-BR', kind: 'newsletter', page: '3' }), expected)
	assert.deepEqual(parseListQuery(CATALOGUE_LIST, { kind: 'sectors' }), { kind: 'sectors', q: '' })
})

test('invalid values fall back to the default instead of failing', () => {
	assert.deepEqual(parseListQuery(NEWSROOM_LIST, { status: 'live', locale: 'fr', kind: 'Not A Key', page: '0' }), { q: '', status: '', locale: '', kind: '', page: 1 })
	assert.equal(parseListQuery(NEWSROOM_LIST, { page: '-2' }).page, 1)
	assert.equal(parseListQuery(NEWSROOM_LIST, { page: '2.5' }).page, 1)
	assert.equal(parseListQuery(NEWSROOM_LIST, { page: '99999999' }).page, 1)
	assert.equal(parseListQuery(CATALOGUE_LIST, { kind: 'people' }).kind, 'services')
	assert.equal(parseListQuery(COUNTRY_LIST, { region: 'europe' }).region, '')
	assert.equal(parseListQuery(COUNTRY_LIST, { region: 'none' }).region, 'none')
	assert.equal(parseListQuery(COUNTRY_LIST, { region: 'DA2F9043-0000-4000-8000-000000000000' }).region, 'da2f9043-0000-4000-8000-000000000000')
})

test('"missing" and "not-live" need a language; without one they are dropped', () => {
	assert.equal(parseListQuery(NEWSROOM_LIST, { status: 'missing' }).status, '')
	assert.equal(parseListQuery(NEWSROOM_LIST, { status: 'not-live' }).status, '')
	assert.equal(parseListQuery(NEWSROOM_LIST, { status: 'not-live', locale: 'pt-PT' }).status, 'not-live')
	assert.equal(parseListQuery(NEWSROOM_LIST, { status: 'missing', locale: 'de' }).status, 'missing')
	assert.equal(parseListQuery(COUNTRY_LIST, { status: 'missing', locale: 'it' }).status, 'missing')
})

test('search text is trimmed, collapsed and capped', () => {
	assert.equal(normalizeSearch('  energy \n  transition  '), 'energy transition')
	assert.equal(normalizeSearch('x'.repeat(150)).length, 100)
	assert.equal(normalizeSearch(undefined), '')
	assert.equal(parseListQuery(NEWSROOM_LIST, { q: '   ' }).q, '')
})

test('URLs leave out defaults and keep spec order', () => {
	assert.equal(listQueryString(NEWSROOM_LIST, { q: '', status: '', locale: '', kind: '', page: 1 }), '')
	assert.equal(listQueryString(NEWSROOM_LIST, { page: 2, q: 'ai', locale: 'de', status: 'missing', kind: '' }), '?q=ai&status=missing&locale=de&page=2')
	assert.equal(listQueryString(CATALOGUE_LIST, { kind: 'services', q: '' }), '')
	assert.equal(listQueryString(CATALOGUE_LIST, { kind: 'sectors', q: 'energy & space' }), '?kind=sectors&q=energy+%26+space')
	const state = parseListQuery(NEWSROOM_LIST, { q: 'a b', status: 'draft', locale: 'it', page: '4' })
	assert.deepEqual(parseListQuery(NEWSROOM_LIST, new URLSearchParams(listQueryString(NEWSROOM_LIST, state))), state)
})

test('changing a filter returns to page 1; changing the page keeps the filters', () => {
	const state = parseListQuery(NEWSROOM_LIST, { q: 'ai', page: '3' })
	assert.deepEqual(changeListQuery(NEWSROOM_LIST, state, { status: 'published' }), { q: 'ai', status: 'published', locale: '', kind: '', page: 1 })
	assert.deepEqual(changeListQuery(NEWSROOM_LIST, state, { page: 4 }), { q: 'ai', status: '', locale: '', kind: '', page: 4 })
	// Clearing the language also drops a "missing" filter that needed it.
	const missing = parseListQuery(NEWSROOM_LIST, { status: 'missing', locale: 'de' })
	assert.equal(changeListQuery(NEWSROOM_LIST, missing, { locale: '' }).status, '')
	// Lists without pages simply apply the change.
	assert.deepEqual(changeListQuery(CATALOGUE_LIST, { kind: 'services', q: 'x' }, { kind: 'sectors' }), { kind: 'sectors', q: 'x' })
})

test('filters are detected apart from the page and ignored parameters', () => {
	assert.equal(hasListFilters(NEWSROOM_LIST, parseListQuery(NEWSROOM_LIST, { page: '5' })), false)
	assert.equal(hasListFilters(NEWSROOM_LIST, parseListQuery(NEWSROOM_LIST, { kind: 'event' })), true)
	assert.equal(hasListFilters(CATALOGUE_LIST, { kind: 'sectors', q: '' }, ['kind']), false)
	assert.equal(hasListFilters(CATALOGUE_LIST, { kind: 'sectors', q: 'x' }, ['kind']), true)
})

test('page windows clamp the page and give range bounds', () => {
	assert.deepEqual(pageWindow(0, 1, 20), { page: 1, pageCount: 1, from: 0, to: 19, first: 0, last: 0 })
	assert.deepEqual(pageWindow(45, 2, 20), { page: 2, pageCount: 3, from: 20, to: 39, first: 21, last: 40 })
	assert.deepEqual(pageWindow(45, 3, 20), { page: 3, pageCount: 3, from: 40, to: 59, first: 41, last: 45 })
	assert.deepEqual(pageWindow(45, 9, 20), { page: 3, pageCount: 3, from: 40, to: 59, first: 41, last: 45 })
	assert.deepEqual(pageWindow(249, 5, 50), { page: 5, pageCount: 5, from: 200, to: 249, first: 201, last: 249 })
})

test('search patterns match text literally and stay inside PostgREST filter syntax', () => {
	assert.equal(containsPattern(' hiring '), '%hiring%')
	assert.equal(containsPattern('100%_done\\'), '%100\\%\\_done\\\\%')
	assert.equal(containsPattern('a,b(c)"d*e:f'), '%a_b_c__d_e_f%')
})
