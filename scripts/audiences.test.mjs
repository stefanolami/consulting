import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import {
	AUDIENCE_ADMIN_LABELS,
	AUDIENCE_STORAGE_KEY,
	AUDIENCES,
	audienceBootScript,
	audienceSearch,
	isServicesListingPath,
	nextAudience,
	parseAudience,
	parseAudienceList,
	resolveAudience,
	tileEmphasis,
} from '../src/lib/audiences.mjs'

const LOCALES = ['en', 'de', 'it', 'pt-BR', 'pt-PT']
const messages = (locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))

test('the three audiences match the migration check and have labels everywhere', () => {
	assert.deepEqual([...AUDIENCES], ['business', 'government', 'academia'])
	const migration = readFileSync(new URL('../supabase/migrations/20261112120000_service_audiences.sql', import.meta.url), 'utf8')
	assert.match(migration, /array\['business', 'government', 'academia'\]::text\[\]/)
	assert.deepEqual(Object.keys(AUDIENCE_ADMIN_LABELS), [...AUDIENCES])
	for (const locale of LOCALES) assert.deepEqual(Object.keys(messages(locale).Audience.options), [...AUDIENCES], locale)
})

test('parsing accepts only the three keys, case and spaces aside', () => {
	assert.equal(parseAudience('business'), 'business')
	assert.equal(parseAudience(' Academia '), 'academia')
	for (const value of ['', 'all', 'none', 'gov', 'government-institute', 'constructor', '__proto__', null, undefined, 3, ['business']]) {
		assert.equal(parseAudience(value), null, String(value))
	}
	assert.deepEqual(parseAudienceList(['academia', 'business', 'academia', 'other']), ['business', 'academia'])
	assert.deepEqual(parseAudienceList('government'), ['government'])
	assert.deepEqual(parseAudienceList(null), [])
	assert.deepEqual(parseAudienceList(undefined), [])
})

test('the address wins over the stored choice; an invalid address falls back', () => {
	assert.equal(resolveAudience({ stored: 'business', url: 'academia' }), 'academia')
	assert.equal(resolveAudience({ stored: 'business', url: null }), 'business')
	assert.equal(resolveAudience({ stored: 'business', url: 'nonsense' }), 'business')
	assert.equal(resolveAudience({ stored: 'nonsense', url: null }), null)
	assert.equal(resolveAudience({ url: 'government' }), 'government')
	assert.equal(resolveAudience(), null)
})

test('choosing the current audience again, or All, returns to none', () => {
	assert.equal(nextAudience(null, 'business'), 'business')
	assert.equal(nextAudience('business', 'academia'), 'academia')
	assert.equal(nextAudience('business', 'business'), null)
	assert.equal(nextAudience('business', null), null)
	assert.equal(nextAudience(null, null), null)
})

test('tiles: all at full strength without an audience; otherwise highlighted or muted', () => {
	// The Figma mapping (6393:6, 6633:100, 6633:32) as seeded by the migration.
	const services = {
		'association-management': ['government'],
		'event-organisation': ['business'],
		'market-research': ['academia'],
		'reputation-management': ['business', 'government'],
		'visibility-communications': [],
	}
	const highlighted = (audience) => Object.entries(services).filter(([, audiences]) => tileEmphasis(audiences, audience) === 'highlighted').map(([key]) => key)
	for (const audiences of Object.values(services)) assert.equal(tileEmphasis(audiences, null), 'default')
	assert.deepEqual(highlighted('business'), ['event-organisation', 'reputation-management'])
	assert.deepEqual(highlighted('government'), ['association-management', 'reputation-management'])
	assert.deepEqual(highlighted('academia'), ['market-research'])
	assert.equal(tileEmphasis([], 'academia'), 'muted')
	assert.equal(tileEmphasis(['business'], 'nonsense'), 'default')
})

test('the Services listing is recognised in every locale, and only the listing', () => {
	for (const path of ['/services', '/services/', '/de/services', '/pt-BR/services']) assert.equal(isServicesListingPath(path, LOCALES), true, path)
	for (const path of ['/', '/sectors', '/services/market-research', '/fr/services', '/xservices', '/de/services/x']) assert.equal(isServicesListingPath(path, LOCALES), false, path)
})

test('the address keeps other parameters and drops the audience for none', () => {
	assert.equal(audienceSearch('', 'business'), '?audience=business')
	assert.equal(audienceSearch('?audience=business', 'academia'), '?audience=academia')
	assert.equal(audienceSearch('?audience=business', null), '')
	assert.equal(audienceSearch('?utm=x&audience=business', null), '?utm=x')
	assert.equal(audienceSearch('?utm=x', 'government'), '?utm=x&audience=government')
})

// Runs the real inline <head> script against a minimal browser.
function boot({ path = '/', search = '', stored = null, storage = 'ok' } = {}) {
	const store = new Map(stored ? [[AUDIENCE_STORAGE_KEY, stored]] : [])
	const attributes = new Map()
	const localStorage = {
		getItem(key) { if (storage === 'blocked') throw new Error('SecurityError'); return store.get(key) ?? null },
		setItem(key, value) { if (storage !== 'ok') throw new Error('QuotaExceededError'); store.set(key, String(value)) },
	}
	const context = {
		document: { documentElement: { setAttribute: (name, value) => attributes.set(name, value) } },
		localStorage,
		location: { pathname: path, search },
		URLSearchParams,
	}
	vm.runInNewContext(audienceBootScript(LOCALES), context)
	return { applied: attributes.get('data-audience') ?? null, stored: store.get(AUDIENCE_STORAGE_KEY) ?? null }
}

test('the inline script applies the stored audience before paint', () => {
	assert.deepEqual(boot(), { applied: null, stored: null })
	assert.deepEqual(boot({ path: '/contact', stored: 'government' }), { applied: 'government', stored: 'government' })
	assert.deepEqual(boot({ stored: 'nonsense' }), { applied: null, stored: 'nonsense' })
})

test('the inline script lets ?audience= win on the Services listing only, and stores it', () => {
	assert.deepEqual(boot({ path: '/services', search: '?audience=academia', stored: 'business' }), { applied: 'academia', stored: 'academia' })
	assert.deepEqual(boot({ path: '/de/services', search: '?audience=Business' }), { applied: 'business', stored: 'business' })
	assert.deepEqual(boot({ path: '/services', search: '?audience=nonsense', stored: 'business' }), { applied: 'business', stored: 'business' })
	assert.deepEqual(boot({ path: '/contact', search: '?audience=academia', stored: 'business' }), { applied: 'business', stored: 'business' })
})

test('the inline script survives storage that is blocked or full', () => {
	assert.deepEqual(boot({ path: '/services', search: '?audience=academia', storage: 'blocked' }), { applied: 'academia', stored: null })
	assert.deepEqual(boot({ path: '/services', search: '?audience=academia', stored: 'business', storage: 'read-only' }), { applied: 'academia', stored: 'business' })
	assert.deepEqual(boot({ path: '/contact', storage: 'blocked' }), { applied: null, stored: null })
})
