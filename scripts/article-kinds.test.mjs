import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { ARTICLE_KIND_LABELS, ARTICLE_KINDS, articleKindLabel, articleKindSchema, isArticleKind } from '../src/lib/article-kinds.mjs'

const LOCALES = ['en', 'de', 'it', 'pt-BR', 'pt-PT']
const messages = (locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))

test('the vocabulary is the nine kinds the public newsroom labels, in every locale', () => {
	assert.equal(ARTICLE_KINDS.length, 9)
	for (const locale of LOCALES) assert.deepEqual(Object.keys(messages(locale).Newsroom.kinds).sort(), [...ARTICLE_KINDS].sort(), locale)
})

test('every kind has its own admin label', () => {
	assert.deepEqual(Object.keys(ARTICLE_KIND_LABELS).sort(), [...ARTICLE_KINDS].sort())
	assert.equal(new Set(Object.values(ARTICLE_KIND_LABELS)).size, ARTICLE_KINDS.length)
	assert.equal(articleKindLabel('vodcast'), 'Vodcast')
	assert.equal(articleKindLabel('interview'), 'interview')
})

test('the server schema accepts only the listed kinds', () => {
	for (const kind of ARTICLE_KINDS) assert.equal(articleKindSchema.parse(kind), kind)
	for (const kind of ['', 'Article', 'interview', 'video-podcast', null, undefined]) {
		const result = articleKindSchema.safeParse(kind)
		assert.equal(result.success, false, String(kind))
		assert.equal(result.error.issues[0].message, 'Choose one of the listed article kinds.')
	}
	assert.equal(isArticleKind('book'), true)
	assert.equal(isArticleKind('constructor'), false)
})
