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
	assert.deepEqual(plan.counts, { created: 79, updated: 0, skipped: 0, conflicting: 0 })
	assert.equal(plan.create.storageObjects.length, 10)
	assert.equal(plan.create.peopleRoles.length, 9)
})
