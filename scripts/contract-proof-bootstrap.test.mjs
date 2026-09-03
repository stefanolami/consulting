import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createContractProofPlan, emptyContractProofState, loadContractProofCatalogue, validateContractProofCatalogue } from './lib/contract-proof-bootstrap.mjs'

const config = JSON.parse(await readFile(new URL('./data/visual-test-bootstrap.json', import.meta.url), 'utf8'))
const catalogue = await loadContractProofCatalogue({ config, publicDirectory: new URL('../public/', import.meta.url) })

function prerequisiteState() {
	const state = emptyContractProofState()
	state.countries.push({ code: 'BR', flag_media_id: null, outline_media_id: null, is_covered: true, last_reviewed_on: null, updated_at: '2026-09-03T00:00:00.000Z' })
	state.countryTranslations.push({ country_code: 'BR', locale: 'en', slug: 'brazil', name: 'Brazil', summary: null, coverage_summary: null, content: { type: 'doc', content: [] }, seo_title: null, seo_description: null, status: 'published', published_at: config.publishedAt, updated_at: '2026-09-03T00:00:00.000Z' })
	state.services.push(...catalogue.country.services.map((service, index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, stable_key: service.service, is_active: true })))
	state.people.push({ id: '00000000-0000-4000-8000-000000000010', stable_key: 'glenn-cezanne', is_active: true })
	return state
}

test('contract proof is source-bounded and uses managed SVG/PNG media', () => {
	assert.deepEqual(validateContractProofCatalogue(catalogue).issues, [])
	assert.equal(catalogue.country.code, 'BR')
	assert.equal(catalogue.country.offices.length, 3)
	assert.ok(catalogue.country.offices.every((office) => office.email === 'brazil@consultingontap.com'))
	assert.ok(catalogue.country.services.every((service) => service.coverageLevel === null))
	assert.equal(catalogue.country.statistic.numericValue, 3)
	assert.match(catalogue.country.flag.mimeType, /^image\//)
	assert.match(catalogue.country.outline.mimeType, /^image\//)
	assert.equal(catalogue.partner.logo.mimeType, 'image/png')
})

test('clean prerequisites produce only additive creates and two guarded Brazil updates', () => {
	const plan = createContractProofPlan(catalogue, prerequisiteState())
	assert.deepEqual(plan.conflicts, [])
	assert.equal(plan.counts.created, 35)
	assert.equal(plan.counts.updated, 2)
	assert.equal(plan.create.countryServices.length, 4)
	assert.equal(plan.create.offices.length, 3)
	assert.equal(plan.create.siteSettings.length, 2)
})

test('human-authored country content and settings are surfaced as conflicts', () => {
	const state = prerequisiteState()
	state.countryTranslations[0].summary = 'Editorial copy'
	state.siteSettings.push({ key: 'contact_footer', value: { email: 'human@example.com' }, is_public: true, description: 'Human-authored.' })
	const plan = createContractProofPlan(catalogue, state)
	assert.ok(plan.conflicts.some((conflict) => conflict.entity === 'country_translation'))
	assert.ok(plan.conflicts.some((conflict) => conflict.entity === 'site_setting'))
})
