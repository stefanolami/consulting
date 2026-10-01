import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { createPlaceholderArticlePlan, emptyPlaceholderArticleState, loadPlaceholderArticles, validatePlaceholderArticles } from './lib/placeholder-articles-bootstrap.mjs'

const config = JSON.parse(await readFile(new URL('./data/visual-test-bootstrap.json', import.meta.url), 'utf8'))
const articles = loadPlaceholderArticles(config)

function referenceState() {
	const state = emptyPlaceholderArticleState()
	const rows = (keys) => keys.map((stable_key, index) => ({ id: `${stable_key}-id-${index}`, stable_key }))
	state.people = rows(['omar-cutajar', 'guilherme-ferreira', 'mathias-gerstner'])
	state.tags = rows(['eu-latam', 'space'])
	state.services = rows(config.services.map((entry) => entry.id))
	state.sectors = rows(config.sectors.map((entry) => entry.id))
	state.mediaAssets = ['newsroom/legacy/latam-banner.jpg', 'newsroom/legacy/space-banner-cropped.png', 'newsroom/legacy/latam-content.jpg', 'newsroom/legacy/space-content.jpg'].map((object_path, index) => ({ id: `media-${index}`, object_path }))
	return state
}

test('placeholder articles are valid, prefixed and cover every labelled kind', () => {
	assert.deepEqual(validatePlaceholderArticles(articles).issues, [])
	assert.equal(articles.length, 16)
	assert.ok(articles.every((article) => article.stableKey.startsWith('placeholder-')))
	assert.deepEqual([...new Set(articles.map((article) => article.kind))].sort(), ['announcement', 'article', 'book', 'event', 'media', 'newsletter', 'podcast', 'video', 'vodcast'])
	assert.equal(articles.filter((article) => article.isFeatured).length, 1)
})

test('an empty hosted state produces a create-only plan', () => {
	const plan = createPlaceholderArticlePlan(articles, referenceState())
	assert.deepEqual(plan.conflicts, [])
	assert.equal(plan.create.articles.length, 16)
	assert.equal(plan.create.articleTranslations.length, 16)
	assert.equal(plan.create.articleRelations.length, 6)
})

test('missing references and edited placeholders are conflicts', () => {
	const state = referenceState()
	state.tags = []
	assert.ok(createPlaceholderArticlePlan(articles, state).conflicts.some((item) => item.reason.startsWith('Unknown tag')))

	const edited = referenceState()
	const [first] = articles
	edited.articles = [{ id: 'a1', stable_key: first.stableKey, kind: first.kind, cover_media_id: 'media-1', external_media_url: null, is_featured: first.isFeatured, featured_order: first.featuredOrder }]
	edited.articleTranslations = [{ article_id: 'a1', locale: 'en', slug: first.slug, title: 'Edited by a colleague', excerpt: first.excerpt, content: first.content, sources: first.sources, status: 'published', published_at: first.publishedAt }]
	const plan = createPlaceholderArticlePlan(articles, edited)
	assert.ok(plan.conflicts.some((item) => item.entity === 'article_translation' && item.key === `en:${first.stableKey}`))
	assert.equal(plan.create.articles.length, 15)
})
