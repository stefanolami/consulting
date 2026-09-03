import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildNewsroomCatalogue, createNewsroomPlan, emptyNewsroomState, loadNewsroomInputs, parseLegacyNews, validateNewsroomCatalogue } from './lib/newsroom-bootstrap.mjs'

const inputs = await loadNewsroomInputs({
	configPath: new URL('./data/newsroom-bootstrap.json', import.meta.url),
	legacyNewsPath: new URL('../src/data/news.js', import.meta.url),
	mediaDirectory: new URL('../public/newsroom/', import.meta.url),
})
const catalogue = buildNewsroomCatalogue(inputs)

test('only the two active legacy articles are parsed', () => {
	assert.equal(parseLegacyNews('const NEWS = [{ slug: "one" }, /* { slug: "ignored" } */]\nexport default NEWS').length, 1)
	assert.deepEqual(catalogue.articles.map((article) => article.slug), [
		'the-european-union-and-latin-america-a-herculean-matter',
		'europe-space-economy-turning-flagship-projects-into-growth-markets',
	])
})

test('legacy newsroom content builds a complete controlled English baseline', () => {
	assert.deepEqual(validateNewsroomCatalogue(catalogue).issues, [])
	assert.equal(catalogue.authors.length, 3)
	assert.equal(catalogue.tags.length, 2)
	assert.deepEqual(catalogue.articles.flatMap((article) => article.inlineImages.map((image) => image.filename)), ['latam-content.jpg', 'space-content.jpg'])
	assert.deepEqual(catalogue.articles.map((article) => article.publishedAt), ['2025-09-10T00:00:00.000Z', '2025-09-15T00:00:00.000Z'])
	assert.ok(catalogue.articles[1].content.content.some((node) => node.type === 'orderedList'))
	assert.ok(JSON.stringify(catalogue.articles[1].content).includes('"type":"bold"'))
	assert.deepEqual(catalogue.articles.map((article) => article.content.attrs.schemaVersion), [2, 2])
	for (const article of catalogue.articles) {
		const imageIndex = article.content.content.findIndex((node) => node.type === 'articleImage')
		const sourceSectionIndex = article.content.content.findIndex((node) => node.type === 'heading' && node.content?.[0]?.text === (article === catalogue.articles[0] ? 'Mercosur: The Litmus Test' : 'From Data to Markets'))
		assert.ok(imageIndex > sourceSectionIndex)
		const attributes = article.content.content[imageIndex].attrs
		assert.deepEqual(Object.keys(attributes).sort(), ['alt', 'caption', 'layout', 'mediaId'])
		assert.match(attributes.mediaId, /^[0-9a-f-]{36}$/)
		assert.equal(attributes.layout, 'wide')
		assert.equal(attributes.caption, null)
		assert.ok(!JSON.stringify(attributes).includes('http'))
	}
})

test('an empty hosted project produces create-only operations', () => {
	const plan = createNewsroomPlan(catalogue, emptyNewsroomState())
	assert.deepEqual(plan.counts, { created: 32, updated: 0, skipped: 0, conflicting: 0 })
	assert.equal(plan.create.articleAuthors.length, 4)
	assert.equal(plan.create.articleTags.length, 2)
})

test('conflicting human-authored records block rather than overwrite', () => {
	const existing = emptyNewsroomState()
	existing.people.push({ id: 'person-1', stable_key: 'mathias-gerstner', display_name: 'Different Name', email: null, is_team_member: true, is_author: false, is_active: true })
	const plan = createNewsroomPlan(catalogue, existing)
	assert.equal(plan.conflicts.some((item) => item.entity === 'person' && item.key === 'mathias-gerstner'), true)
})
