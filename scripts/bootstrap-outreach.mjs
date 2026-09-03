import { createClient } from '@supabase/supabase-js'

import {
	buildReferenceCatalogue,
	createImportPlan,
	loadReferenceInputs,
	validateReferenceInputs,
} from './lib/outreach-bootstrap.mjs'

const allowedArguments = new Set(['--apply', '--dry-run', '--help'])
const unknownArguments = process.argv.slice(2).filter(
	(argument) => !allowedArguments.has(argument),
)

if (process.argv.includes('--help')) {
	console.log(`Usage: npm run outreach:bootstrap -- [--dry-run | --apply]

Dry-run is the default. It validates the checked-in reference data, legacy map,
local topology, and hosted records without changing Supabase. --apply performs
only the displayed non-destructive creates and safe null-region updates.`)
	process.exit(0)
}

if (
	unknownArguments.length ||
	(process.argv.includes('--apply') && process.argv.includes('--dry-run'))
) {
	console.error(
		unknownArguments.length
			? `Unknown argument(s): ${unknownArguments.join(', ')}`
			: 'Choose either --dry-run or --apply, not both.',
	)
	process.exit(1)
}

const applyMode = process.argv.includes('--apply')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey =
	process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !secretKey) {
	console.error(
		'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local. No credentials were printed.',
	)
	process.exit(1)
}

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
const validation = validateReferenceInputs({ ...inputs, catalogue })
const supabase = createClient(supabaseUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false },
})
const existing = await fetchExistingState(supabase)
const plan = createImportPlan(catalogue, existing)

console.log(formatDryRunReport({
	applyMode,
	catalogue,
	dataset: inputs.dataset,
	existing,
	plan,
	validation,
}))

if (!applyMode) {
	console.log('\nDRY RUN ONLY: no hosted records were changed.')
	process.exit(validation.fatalIssues.length || plan.conflicts.length ? 2 : 0)
}

if (validation.fatalIssues.length || plan.conflicts.length) {
	console.error(
		'\nApply refused because the dry run contains validation failures or hosted-data conflicts.',
	)
	process.exit(2)
}

await applyPlan({ supabase, plan })
console.log(
	`\nAPPLY COMPLETE: created ${plan.counts.created}, updated ${plan.counts.updated}, skipped ${plan.counts.skipped}, conflicting ${plan.counts.conflicting}.`,
)

async function fetchExistingState(client) {
	const [regions, regionTranslations, countries, countryTranslations] =
		await Promise.all([
			client.from('regions').select('id, stable_key, is_active'),
			client
				.from('region_translations')
				.select('region_id, locale, slug, name, status'),
			client.from('countries').select('code, region_id, is_covered'),
			client
				.from('country_translations')
				.select('country_code, locale, slug, name, status'),
		])
	const failure = [
		['regions', regions.error],
		['region translations', regionTranslations.error],
		['countries', countries.error],
		['country translations', countryTranslations.error],
	].find(([, error]) => error)

	if (failure) {
		throw new Error(
			`Unable to read hosted ${failure[0]} for the dry run: ${failure[1].message}`,
		)
	}

	return {
		regions: regions.data ?? [],
		regionTranslations: regionTranslations.data ?? [],
		countries: countries.data ?? [],
		countryTranslations: countryTranslations.data ?? [],
	}
}

async function applyPlan({ supabase: client, plan: importPlan }) {
	if (importPlan.create.regions.length) {
		const { error } = await client.from('regions').insert(
			importPlan.create.regions.map((region) => ({
				stable_key: region.stableKey,
			})),
		)
		if (error) throw new Error(`Unable to create regions: ${error.message}`)
	}

	const { data: regionRows, error: regionError } = await client
		.from('regions')
		.select('id, stable_key')
	if (regionError) {
		throw new Error(`Unable to resolve canonical regions: ${regionError.message}`)
	}
	const regionIds = new Map(
		(regionRows ?? []).map((region) => [region.stable_key, region.id]),
	)

	if (importPlan.create.regionTranslations.length) {
		const { error } = await client.from('region_translations').insert(
			importPlan.create.regionTranslations.map((region) => ({
				region_id: requiredRegionId(regionIds, region.stableKey),
				locale: 'en',
				slug: region.slug,
				name: region.englishName,
				status: 'draft',
			})),
		)
		if (error) {
			throw new Error(`Unable to create English region drafts: ${error.message}`)
		}
	}

	if (importPlan.create.countries.length) {
		const { error } = await client.from('countries').insert(
			importPlan.create.countries.map((country) => ({
				code: country.code,
				region_id: country.regionKey
					? requiredRegionId(regionIds, country.regionKey)
					: null,
				is_covered: country.isCovered,
			})),
		)
		if (error) throw new Error(`Unable to create countries: ${error.message}`)
	}

	for (const country of importPlan.update.countries) {
		const { data, error } = await client
			.from('countries')
			.update({ region_id: requiredRegionId(regionIds, country.regionKey) })
			.eq('code', country.code)
			.is('region_id', null)
			.select('code')

		if (error || data?.length !== 1) {
			throw new Error(
				`Unable to set the missing region for ${country.code}: ${error?.message ?? 'the record changed after the dry run'}.`,
			)
		}
	}

	if (importPlan.create.countryTranslations.length) {
		const { error } = await client.from('country_translations').insert(
			importPlan.create.countryTranslations.map((country) => ({
				country_code: country.code,
				locale: 'en',
				slug: country.slug,
				name: country.englishName,
				status: 'draft',
			})),
		)
		if (error) {
			throw new Error(`Unable to create English country drafts: ${error.message}`)
		}
	}
}

function formatDryRunReport({
	applyMode: isApplyMode,
	catalogue: reference,
	dataset,
	existing: hosted,
	plan: importPlan,
	validation: checks,
}) {
	const covered = reference.countries.filter((country) => country.isCovered)
	const countryCreatesByRegion = groupCountryCodes(
		importPlan.create.countries,
		reference.regions,
	)
	const topologyMissing = checks.referenceCountriesMissingFromTopology.map(
		(country) => `${country.code} (${country.englishName})`,
	)
	const lines = [
		'OUTREACH CATALOGUE BOOTSTRAP',
		`Mode: ${isApplyMode ? 'APPLY (pre-apply report)' : 'DRY RUN (default)'}`,
		`Reference version: ${dataset.version}`,
		'',
		'REFERENCE SCOPE',
		`- ISO 3166-1 alpha-2 countries: ${reference.countries.length}`,
		`- Legacy-covered countries: ${covered.length}`,
		`- Uncovered reference countries: ${reference.countries.length - covered.length}`,
		`- Canonical regions: ${reference.regions.length}`,
		`- Countries deliberately without a region: ${list(dataset.unassignedIsoAlpha2Codes)}`,
		`- Covered ISO codes: ${covered.map((country) => country.code).join(', ')}`,
		'',
		'LOCAL VALIDATION',
		`- Duplicate ISO assignments: ${checks.duplicateIsoCodes.length}${details(checks.duplicateIsoCodes.map((issue) => issue.code))}`,
		`- Duplicate covered ISO codes: ${checks.duplicateCoveredIsoCodes.length}${details(checks.duplicateCoveredIsoCodes)}`,
		`- Slug collisions: ${checks.slugCollisions.length}${details(checks.slugCollisions.map((issue) => `${issue.slug}: ${issue.codes.join('/')}`))}`,
		`- Unmapped legacy country names: ${checks.unmappedLegacyCountryNames.length}${details(checks.unmappedLegacyCountryNames.map((issue) => issue.name))}`,
		`- Ignored legacy source cross-check: ${checks.legacySourceAvailable ? 'completed' : 'not present (checked-in coverage snapshot used)'}`,
		`- Legacy capture differences: ${checks.legacyCoverageCaptureDifferences.length}${details(checks.legacyCoverageCaptureDifferences.map((issue) => issue.code))}`,
		`- Region-assignment conflicts: ${checks.regionAssignmentConflicts.length}${details(checks.regionAssignmentConflicts.map((issue) => issue.code))}`,
		`- Local topology features: ${checks.topologyFeatureCount}`,
		`- Reliably ISO-mapped topology features: ${checks.mappedTopologyFeatureCount}`,
		`- Geography features without a reliable ISO mapping: ${checks.geographyFeaturesWithoutReliableIsoMapping.length}${details(checks.geographyFeaturesWithoutReliableIsoMapping.map((feature) => `${feature.name} (id: ${feature.id ?? 'missing'})`))}`,
		`- Legacy covered countries missing from local topology: ${checks.legacyCountriesMissingFromTopology.length}${details(checks.legacyCountriesMissingFromTopology.map((country) => country.code))}`,
		`- ISO reference countries absent from low-detail topology: ${topologyMissing.length}${details(topologyMissing)}`,
		'- Disputed/non-standard entity decisions:',
		...checks.disputedAndNonStandardEntities.map(
			(entity) =>
				`  - ${entity.topologyName}: ${entity.decision} Present: ${entity.presentInTopology ? 'yes' : 'no'}.`,
		),
		`- Fatal local validation issues: ${checks.fatalIssues.length}${details(checks.fatalIssues)}`,
		'',
		'HOSTED SNAPSHOT (READ ONLY)',
		`- Regions: ${hosted.regions.length}`,
		`- Region translations (all locales): ${hosted.regionTranslations.length}`,
		`- Countries: ${hosted.countries.length}`,
		`- Country translations (all locales): ${hosted.countryTranslations.length}`,
		'',
		'PROPOSED OPERATIONS',
		`- Created: ${importPlan.counts.created}`,
		`- Updated: ${importPlan.counts.updated}`,
		`- Skipped: ${importPlan.counts.skipped}`,
		`- Conflicting: ${importPlan.counts.conflicting}`,
		`- Create regions (${importPlan.create.regions.length}): ${list(importPlan.create.regions.map((region) => region.stableKey))}`,
		`- Create English region drafts (${importPlan.create.regionTranslations.length}): ${list(importPlan.create.regionTranslations.map((region) => region.stableKey))}`,
		`- Create country rows (${importPlan.create.countries.length}):`,
		...countryCreatesByRegion,
		`- Create English country drafts (${importPlan.create.countryTranslations.length}): ${list(importPlan.create.countryTranslations.map((country) => country.code))}`,
		`- Fill missing country region relationships (${importPlan.update.countries.length}): ${list(importPlan.update.countries.map((country) => `${country.code}->${country.regionKey}`))}`,
		`- Conflicts (${importPlan.conflicts.length}):${details(importPlan.conflicts.map((conflict) => `${conflict.entity} ${conflict.key}: ${conflict.reason}`))}`,
		'',
		'SAFETY AND PUBLICATION',
		'- Creates only canonical regions, ISO country rows, and English draft reference translations.',
		'- Does not create other locales or publish any translation.',
		'- Does not write summaries, SEO, statistics, services, offices, experts, people, media, or map presentation fields.',
		'- Existing non-null regions, coverage flags, English names/slugs, editorial fields, publication state, and other locales are never overwritten.',
		'- Apply is refused when validation failures or hosted conflicts exist; a partial infrastructure/network failure is safe to inspect and rerun.',
	]

	return lines.join('\n')
}

function requiredRegionId(regionIds, stableKey) {
	const id = regionIds.get(stableKey)
	if (!id) throw new Error(`Canonical region "${stableKey}" is unavailable.`)
	return id
}

function groupCountryCodes(countries, regions) {
	const keys = [...regions.map((region) => region.stableKey), null]
	return keys.map((regionKey) => {
		const codes = countries
			.filter((country) => country.regionKey === regionKey)
			.map((country) => country.code)
		return `  - ${regionKey ?? 'unassigned'} (${codes.length}): ${list(codes)}`
	})
}

function list(values) {
	return values.length ? values.join(', ') : 'none'
}

function details(values) {
	return values.length ? ` [${values.join('; ')}]` : ''
}
