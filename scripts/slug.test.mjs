import assert from 'node:assert/strict'
import test from 'node:test'

import { requiredKey } from '../src/lib/admin-schema.mjs'
import { slugify } from '../src/lib/slug.mjs'

test('a title becomes lowercase words joined by single hyphens', () => {
	assert.equal(slugify('We are hiring an Advocacy & Communication Intern!'), 'we-are-hiring-an-advocacy-communication-intern')
	assert.equal(slugify('  EU – LATAM   update  '), 'eu-latam-update')
	assert.equal(slugify('Market Research 2026'), 'market-research-2026')
})

test('accents are removed and apostrophes do not split a word', () => {
	assert.equal(slugify('Flávia Guerra'), 'flavia-guerra')
	assert.equal(slugify('Associação Brasileira'), 'associacao-brasileira')
	assert.equal(slugify('Straße & Øresund, Łódź'), 'strasse-oresund-lodz')
	assert.equal(slugify('We’re hiring'), 'were-hiring')
	assert.equal(slugify('Côte d’Ivoire'), 'cote-divoire')
})

test('nothing usable gives an empty value, which the required rule refuses', () => {
	assert.equal(slugify(''), '')
	assert.equal(slugify(null), '')
	assert.equal(slugify(' — !? '), '')
	assert.equal(requiredKey.safeParse(slugify('')).success, false)
})

test('every non-empty result passes the stable key and slug rule', () => {
	for (const text of ['Hello', 'Ünïcödé Tëxt', 'a--b__c', '-leading and trailing-', 'Mixed 123 CASE', '日本 Japan', 'Pieter Allers', 'Portuguese (Brazil)']) {
		const slug = slugify(text)
		assert.ok(slug, text)
		assert.equal(requiredKey.safeParse(slug).success, true, `${text} → ${slug}`)
	}
})
