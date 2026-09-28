import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createVisualTestPlan, emptyVisualTestState, loadVisualTestCatalogue, validateVisualTestCatalogue } from './lib/visual-test-bootstrap.mjs'

const catalogue = await loadVisualTestCatalogue({
	configPath: new URL('./data/visual-test-bootstrap.json', import.meta.url),
	teamPath: new URL('../src/data/team.js', import.meta.url),
	publicDirectory: new URL('../public/', import.meta.url),
})

test('visual-test catalogue selects active legacy records and local media', () => {
	assert.deepEqual(validateVisualTestCatalogue(catalogue).issues, [])
	assert.deepEqual(catalogue.people.map((person) => person.stableKey), ['glenn-cezanne', 'corina-gheorgheza', 'omar-cutajar', 'guilherme-ferreira', 'mathias-gerstner'])
	assert.equal(catalogue.services.length, 6)
	assert.equal(catalogue.sectors.length, 6)
	assert.equal(catalogue.sectors.filter((sector) => sector.icon).length, 5)
})

test('profile transformation preserves sections, roles, and endorsements', () => {
	const glenn = catalogue.people[0]
	assert.equal(glenn.roles.length, 4)
	assert.equal(glenn.profileDocument.sections.length, 5)
	assert.match(glenn.profileDocument.sections[0].endorsement.quote, /Cooperating on Public Affairs/)
	assert.match(glenn.shortBio, /Time&Place Consulting in 2016/)
})

test('empty hosted state produces a create-only representative baseline', () => {
	const plan = createVisualTestPlan(catalogue, emptyVisualTestState())
	assert.deepEqual(plan.counts, { created: 113, updated: 0, skipped: 0, conflicting: 0 })
	assert.equal(plan.create.storageObjects.length, 10)
	assert.equal(plan.create.peopleRoles.length, 9)
	assert.equal(plan.create.servicePeople.length + plan.create.sectorPeople.length, 16)
	assert.equal(plan.create.articleServices.length, 12)
	assert.equal(plan.create.articleSectors.length, 12)
})

test('every visual-test service and sector has a body, a contact, and a related article', () => {
	for (const entry of [...catalogue.services, ...catalogue.sectors]) assert.ok(entry.content.content.length, entry.stableKey)
	for (const service of catalogue.services) {
		assert.ok(catalogue.serviceContacts.some((relation) => relation.service === service.stableKey), service.stableKey)
		assert.ok(catalogue.articleServices.some((relation) => relation.service === service.stableKey), service.stableKey)
	}
	for (const sector of catalogue.sectors) {
		assert.ok(catalogue.sectorContacts.some((relation) => relation.sector === sector.stableKey), sector.stableKey)
		assert.ok(catalogue.articleSectors.some((relation) => relation.sector === sector.stableKey), sector.stableKey)
	}
})

test('version-2 empty catalogue bodies are promoted; edited bodies are conflicts', () => {
	const service = catalogue.services[0]
	const state = emptyVisualTestState()
	state.services = [{ id: 's1', stable_key: service.stableKey, icon_media_id: null, display_order: service.displayOrder, is_active: true }]
	const baseline = { service_id: 's1', locale: 'en', slug: service.slug, name: service.name, summary: service.summary, status: 'published', published_at: catalogue.publishedAt, updated_at: '2025-09-02T00:00:00+00:00' }
	state.serviceTranslations = [{ ...baseline, content: { type: 'doc', content: [] } }]
	const promoted = createVisualTestPlan(catalogue, state)
	assert.equal(promoted.update.serviceTranslations.length, 1)
	assert.equal(promoted.update.serviceTranslations[0].expectedUpdatedAt, baseline.updated_at)
	assert.ok(!promoted.conflicts.some((item) => item.entity === 'service_translation'))

	state.serviceTranslations = [{ ...baseline, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edited by a colleague.' }] }] } }]
	const edited = createVisualTestPlan(catalogue, state)
	assert.equal(edited.update.serviceTranslations.length, 0)
	assert.ok(edited.conflicts.some((item) => item.entity === 'service_translation' && item.key === `en:${service.stableKey}`))
})
