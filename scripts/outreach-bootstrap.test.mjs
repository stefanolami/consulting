import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
	buildReferenceCatalogue,
	createImportPlan,
	emptyExistingState,
	loadReferenceInputs,
	matchingExistingState,
	validateReferenceInputs,
} from './lib/outreach-bootstrap.mjs'

const inputs = await loadReferenceInputs({
	datasetPath: new URL('./data/outreach-geography.json', import.meta.url),
	legacyRegionsPath: new URL(
		'../old-funding/src/data/regions.js',
		import.meta.url,
	),
	topologyPath: new URL(
		'../public/data/world-countries-110m.topo.json',
		import.meta.url,
	),
})
const catalogue = buildReferenceCatalogue(inputs.dataset)

test('reference catalogue contains all official ISO countries and legacy coverage', () => {
	assert.equal(catalogue.regions.length, 6)
	assert.equal(catalogue.countries.length, 249)
	assert.equal(
		catalogue.countries.filter((country) => country.isCovered).length,
		40,
	)
	assert.deepEqual(
		catalogue.countries
			.filter((country) => country.regionKey === null)
			.map((country) => country.code),
		['AQ'],
	)
	assert.equal(catalogue.countries.some((country) => country.code === 'XK'), false)
})

test('legacy regions and local topology validate without fatal issues', () => {
	const validation = validateReferenceInputs({ ...inputs, catalogue })

	assert.deepEqual(validation.fatalIssues, [])
	assert.deepEqual(validation.duplicateIsoCodes, [])
	assert.deepEqual(validation.slugCollisions, [])
	assert.deepEqual(validation.unmappedLegacyCountryNames, [])
	assert.deepEqual(validation.legacyCountriesMissingFromTopology, [])
	assert.deepEqual(validation.regionAssignmentConflicts, [])
	assert.deepEqual(
		validation.geographyFeaturesWithoutReliableIsoMapping.map(
			(feature) => feature.name,
		),
		['N. Cyprus', 'Somaliland', 'Kosovo'],
	)
})

test('the checked-in snapshot validates when the ignored legacy checkout is absent', async () => {
	const portableInputs = await loadReferenceInputs({
		datasetPath: new URL('./data/outreach-geography.json', import.meta.url),
		legacyRegionsPath: new URL(
			'./fixtures/legacy-checkout-not-present.js',
			import.meta.url,
		),
		topologyPath: new URL(
			'../public/data/world-countries-110m.topo.json',
			import.meta.url,
		),
	})
	const validation = validateReferenceInputs({
		...portableInputs,
		catalogue,
	})

	assert.equal(validation.legacySourceAvailable, false)
	assert.deepEqual(validation.fatalIssues, [])
})

test('an empty database produces create-only draft bootstrap operations', () => {
	const plan = createImportPlan(catalogue, emptyExistingState())

	assert.deepEqual(plan.counts, {
		created: 510,
		updated: 0,
		skipped: 0,
		conflicting: 0,
	})
	assert.equal(plan.create.regions.length, 6)
	assert.equal(plan.create.regionTranslations.length, 6)
	assert.equal(plan.create.countries.length, 249)
	assert.equal(plan.create.countryTranslations.length, 249)
})

test('a matching prior bootstrap is a no-op on rerun', () => {
	const plan = createImportPlan(catalogue, matchingExistingState(catalogue))

	assert.deepEqual(plan.counts, {
		created: 0,
		updated: 0,
		skipped: 510,
		conflicting: 0,
	})
})

test('human-authored coverage and English routing differences are conflicts, not updates', () => {
	const existing = matchingExistingState(catalogue)
	const france = existing.countries.find((country) => country.code === 'FR')
	const franceTranslation = existing.countryTranslations.find(
		(translation) => translation.country_code === 'FR',
	)
	france.is_covered = false
	franceTranslation.slug = 'france-consulting'
	const plan = createImportPlan(catalogue, existing)

	assert.equal(plan.counts.created, 0)
	assert.equal(plan.counts.updated, 0)
	assert.equal(plan.counts.conflicting, 2)
	assert.match(plan.conflicts[0].reason, /will not be overwritten/i)
	assert.match(plan.conflicts[1].reason, /will not be overwritten/i)
})
