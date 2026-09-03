import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

import isoCountries from 'i18n-iso-countries'

const EMPTY_DOCUMENT = { type: 'doc', content: [] }

export function slugifyReferenceName(name) {
	return name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/&/g, ' and ')
		.replace(/[’']/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export async function loadReferenceInputs({
	datasetPath,
	legacyRegionsPath,
	topologyPath,
}) {
	const [datasetText, topologyText] = await Promise.all([
		readFile(datasetPath, 'utf8'),
		readFile(topologyPath, 'utf8'),
	])
	let legacySource = null

	try {
		legacySource = await readFile(legacyRegionsPath, 'utf8')
	} catch (error) {
		if (error.code !== 'ENOENT') throw error
	}

	return {
		dataset: JSON.parse(datasetText),
		legacyRegions: legacySource ? parseLegacyRegions(legacySource) : null,
		legacySourceAvailable: Boolean(legacySource),
		topology: JSON.parse(topologyText),
	}
}

export function parseLegacyRegions(source) {
	const declaration = source.indexOf('const regions')
	const exportStatement = source.lastIndexOf('export default regions')
	const objectStart = source.indexOf('{', declaration)
	const objectEnd = source.lastIndexOf('}', exportStatement)

	if (
		declaration === -1 ||
		exportStatement === -1 ||
		objectStart === -1 ||
		objectEnd === -1
	) {
		throw new Error(
			'Could not parse old-funding/src/data/regions.js. Expected a const regions object and default export.',
		)
	}

	return vm.runInNewContext(
		`(${source.slice(objectStart, objectEnd + 1)})`,
		Object.create(null),
		{ timeout: 1_000 },
	)
}

export function buildReferenceCatalogue(dataset) {
	const officialCodes = Object.keys(isoCountries.getAlpha2Codes())
		.filter((code) => code !== 'XK')
		.sort()
	const englishNames = isoCountries.getNames('en', { select: 'official' })
	const regionByCode = new Map()

	for (const region of dataset.regions) {
		for (const code of region.isoAlpha2Codes) {
			if (!regionByCode.has(code)) regionByCode.set(code, region.stableKey)
		}
	}

	const coveredCodes = new Set(
		dataset.legacyCoverage.map((country) => country.code),
	)
	const countries = officialCodes.map((code) => {
		const englishName = englishNames[code]

		return {
			code,
			stableKey: code,
			englishName,
			slug: slugifyReferenceName(englishName),
			regionKey: regionByCode.get(code) ?? null,
			isCovered: coveredCodes.has(code),
		}
	})

	return {
		regions: dataset.regions.map((region) => ({
			stableKey: region.stableKey,
			englishName: region.englishName,
			slug: slugifyReferenceName(region.englishName),
		})),
		countries,
	}
}

export function validateReferenceInputs({
	dataset,
	legacyRegions,
	legacySourceAvailable = Boolean(legacyRegions),
	topology,
	catalogue = buildReferenceCatalogue(dataset),
}) {
	const officialCodes = new Set(
		Object.keys(isoCountries.getAlpha2Codes()).filter((code) => code !== 'XK'),
	)
	const assignedCodes = dataset.regions.flatMap((region) =>
		region.isoAlpha2Codes.map((code) => ({
			code,
			regionKey: region.stableKey,
		})),
	)
	const assignmentGroups = groupBy(assignedCodes, (item) => item.code)
	const duplicateIsoCodes = [...assignmentGroups]
		.filter(([, assignments]) => assignments.length > 1)
		.map(([code, assignments]) => ({
			code,
			regionKeys: assignments.map((assignment) => assignment.regionKey),
		}))
	const datasetCodes = new Set([
		...assignedCodes.map((item) => item.code),
		...dataset.unassignedIsoAlpha2Codes,
	])
	const missingOfficialIsoCodes = [...officialCodes]
		.filter((code) => !datasetCodes.has(code))
		.sort()
	const nonOfficialIsoCodes = [...datasetCodes]
		.filter((code) => !officialCodes.has(code))
		.sort()
	const duplicateRegionKeys = duplicates(
		dataset.regions.map((region) => region.stableKey),
	)
	const duplicateCoveredIsoCodes = duplicates(
		dataset.legacyCoverage.map((country) => country.code),
	)
	const slugCollisions = [...groupBy(catalogue.countries, (country) => country.slug)]
		.filter(([, countries]) => countries.length > 1)
		.map(([slug, countries]) => ({
			slug,
			codes: countries.map((country) => country.code),
		}))

	const referenceRegionByCode = new Map(
		catalogue.countries.map((country) => [country.code, country.regionKey]),
	)
	const referenceRegionByName = new Map(
		dataset.regions.map((region) => [region.englishName, region.stableKey]),
	)
	const legacyCountries = []
	const unmappedLegacyCountryNames = []

	for (const country of dataset.legacyCoverage) {
		const resolvedCode = isoCountries.getAlpha2Code(country.legacyName, 'en')

		if (!resolvedCode || resolvedCode === 'XK' || resolvedCode !== country.code) {
			unmappedLegacyCountryNames.push({
				name: country.legacyName,
				declaredCode: country.code,
				resolvedCode,
			})
			continue
		}

		legacyCountries.push({
			code: country.code,
			name: country.legacyName,
			regionKey: country.regionKey,
		})
	}

	const capturedCoverage = new Map(
		dataset.legacyCoverage.map((country) => [
			country.code,
			country.regionKey,
		]),
	)
	const parsedCoverage = new Map()

	if (legacyRegions) {
		for (const legacyRegion of Object.values(legacyRegions)) {
			const regionKey = referenceRegionByName.get(legacyRegion.name)

			for (const country of legacyRegion.countries ?? []) {
				const code = isoCountries.getAlpha2Code(country.name, 'en')
				if (code && code !== 'XK') parsedCoverage.set(code, regionKey)
			}
		}
	}

	const legacyCoverageCaptureDifferences = legacyRegions
		? [
				...[...parsedCoverage].flatMap(([code, regionKey]) => {
					const capturedRegionKey = capturedCoverage.get(code)
					return capturedRegionKey === regionKey
						? []
						: [{ code, parsedRegionKey: regionKey, capturedRegionKey }]
				}),
				...[...capturedCoverage].flatMap(([code, regionKey]) =>
					parsedCoverage.has(code)
						? []
						: [
								{
									code,
									parsedRegionKey: undefined,
									capturedRegionKey: regionKey,
								},
							],
				),
			]
		: []
	const regionAssignmentConflicts = legacyCountries.flatMap((country) => {
		const referenceRegionKey = referenceRegionByCode.get(country.code)
		return referenceRegionKey === country.regionKey
			? []
			: [{ ...country, referenceRegionKey }]
	})

	const geometries = topology.objects?.countries?.geometries
	if (!Array.isArray(geometries)) {
		throw new Error(
			'Topology validation failed: objects.countries.geometries is missing.',
		)
	}

	const mappedTopologyCodes = new Set()
	const geographyFeaturesWithoutReliableIsoMapping = []

	for (const geometry of geometries) {
		const numericCode = numericIdentifier(geometry.id)
		const code = numericCode
			? isoCountries.numericToAlpha2(numericCode)
			: undefined

		if (code && officialCodes.has(code)) {
			mappedTopologyCodes.add(code)
		} else {
			geographyFeaturesWithoutReliableIsoMapping.push({
				name: geometry.properties?.name ?? '(unnamed)',
				id: geometry.id ?? null,
			})
		}
	}

	const expectedNonStandardNames = new Set(
		dataset.nonStandardTopologyEntities.map((entity) => entity.topologyName),
	)
	const unexpectedUnmappedTopologyFeatures =
		geographyFeaturesWithoutReliableIsoMapping.filter(
			(feature) => !expectedNonStandardNames.has(feature.name),
		)
	const missingExpectedNonStandardFeatures =
		dataset.nonStandardTopologyEntities.filter(
			(entity) =>
				!geographyFeaturesWithoutReliableIsoMapping.some(
					(feature) => feature.name === entity.topologyName,
				),
		)
	const legacyCountriesMissingFromTopology = legacyCountries.filter(
		(country) => !mappedTopologyCodes.has(country.code),
	)
	const referenceCountriesMissingFromTopology = catalogue.countries.filter(
		(country) => !mappedTopologyCodes.has(country.code),
	)
	const disputedAndNonStandardEntities =
		dataset.nonStandardTopologyEntities.map((entity) => ({
			...entity,
			presentInTopology: geographyFeaturesWithoutReliableIsoMapping.some(
				(feature) => feature.name === entity.topologyName,
			),
		}))

	const fatalIssues = [
		...duplicateIsoCodes.map((issue) => `Duplicate ISO code: ${issue.code}`),
		...missingOfficialIsoCodes.map((code) => `Missing official ISO code: ${code}`),
		...nonOfficialIsoCodes.map((code) => `Non-official ISO code: ${code}`),
		...duplicateRegionKeys.map((key) => `Duplicate region key: ${key}`),
		...duplicateCoveredIsoCodes.map(
			(code) => `Duplicate covered ISO code: ${code}`,
		),
		...slugCollisions.map((issue) => `Slug collision: ${issue.slug}`),
		...unmappedLegacyCountryNames.map(
			(issue) => `Unmapped legacy country: ${issue.name}`,
		),
		...legacyCoverageCaptureDifferences.map(
			(issue) => `Legacy coverage capture mismatch: ${issue.code}`,
		),
		...regionAssignmentConflicts.map(
			(issue) => `Legacy region assignment conflict: ${issue.code}`,
		),
		...legacyCountriesMissingFromTopology.map(
			(issue) => `Covered legacy country missing from topology: ${issue.code}`,
		),
		...unexpectedUnmappedTopologyFeatures.map(
			(issue) => `Unexpected topology entity without ISO mapping: ${issue.name}`,
		),
		...missingExpectedNonStandardFeatures.map(
			(issue) => `Expected non-standard topology entity is missing: ${issue.topologyName}`,
		),
	]

	return {
		duplicateIsoCodes,
		duplicateRegionKeys,
		duplicateCoveredIsoCodes,
		slugCollisions,
		missingOfficialIsoCodes,
		nonOfficialIsoCodes,
		unmappedLegacyCountryNames,
		legacyCoverageCaptureDifferences,
		geographyFeaturesWithoutReliableIsoMapping,
		legacyCountriesMissingFromTopology,
		referenceCountriesMissingFromTopology,
		disputedAndNonStandardEntities,
		regionAssignmentConflicts,
		fatalIssues,
		legacySourceAvailable,
		topologyFeatureCount: geometries.length,
		mappedTopologyFeatureCount: mappedTopologyCodes.size,
	}
}

export function createImportPlan(catalogue, existing) {
	const create = {
		regions: [],
		regionTranslations: [],
		countries: [],
		countryTranslations: [],
	}
	const update = { countries: [] }
	const skipped = []
	const conflicts = []
	const regionsByKey = new Map(
		existing.regions.map((region) => [region.stable_key, region]),
	)
	const regionKeysById = new Map(
		existing.regions.map((region) => [region.id, region.stable_key]),
	)
	const regionTranslationsByKey = new Map(
		existing.regionTranslations
			.filter((translation) => translation.locale === 'en')
			.map((translation) => [
				regionKeysById.get(translation.region_id),
				translation,
			]),
	)
	const regionEnglishSlugs = new Map(
		existing.regionTranslations
			.filter((translation) => translation.locale === 'en')
			.map((translation) => [translation.slug, translation.region_id]),
	)

	for (const region of catalogue.regions) {
		const current = regionsByKey.get(region.stableKey)

		if (!current) {
			create.regions.push(region)
		} else if (!current.is_active) {
			conflicts.push({
				entity: 'region',
				key: region.stableKey,
				reason: 'The canonical region exists but is inactive; it will not be reactivated automatically.',
			})
		} else {
			skipped.push({ entity: 'region', key: region.stableKey })
		}

		const translation = regionTranslationsByKey.get(region.stableKey)
		const occupiedBy = regionEnglishSlugs.get(region.slug)

		if (!translation) {
			if (occupiedBy && occupiedBy !== current?.id) {
				conflicts.push({
					entity: 'region_translation',
					key: `en:${region.stableKey}`,
					reason: `English slug "${region.slug}" is already used by another region.`,
				})
			} else {
				create.regionTranslations.push(region)
			}
		} else if (
			translation.name !== region.englishName ||
			translation.slug !== region.slug
		) {
			conflicts.push({
				entity: 'region_translation',
				key: `en:${region.stableKey}`,
				reason: 'Existing English reference name or slug differs; human-authored values will not be overwritten.',
			})
		} else {
			skipped.push({
				entity: 'region_translation',
				key: `en:${region.stableKey}`,
			})
		}
	}

	const countriesByCode = new Map(
		existing.countries.map((country) => [country.code, country]),
	)
	const countryTranslationsByCode = new Map(
		existing.countryTranslations
			.filter((translation) => translation.locale === 'en')
			.map((translation) => [translation.country_code, translation]),
	)
	const countryEnglishSlugs = new Map(
		existing.countryTranslations
			.filter((translation) => translation.locale === 'en')
			.map((translation) => [translation.slug, translation.country_code]),
	)

	for (const country of catalogue.countries) {
		const current = countriesByCode.get(country.code)

		if (!current) {
			create.countries.push(country)
		} else {
			const currentRegionKey = current.region_id
				? regionKeysById.get(current.region_id)
				: null
			let countryConflict = false

			if (currentRegionKey !== country.regionKey) {
				if (!current.region_id && country.regionKey) {
					update.countries.push({
						code: country.code,
						regionKey: country.regionKey,
					})
				} else {
					countryConflict = true
					conflicts.push({
						entity: 'country',
						key: country.code,
						reason: `Existing region is ${currentRegionKey ?? 'unresolved'}; expected ${country.regionKey ?? 'unassigned'}.`,
					})
				}
			}

			if (current.is_covered !== country.isCovered) {
				countryConflict = true
				conflicts.push({
					entity: 'country',
					key: country.code,
					reason: `Existing is_covered is ${current.is_covered}; legacy baseline is ${country.isCovered}. Editorial coverage will not be overwritten.`,
				})
			}

			if (
				!countryConflict &&
				!update.countries.some((item) => item.code === country.code)
			) {
				skipped.push({ entity: 'country', key: country.code })
			}
		}

		const translation = countryTranslationsByCode.get(country.code)
		const occupiedBy = countryEnglishSlugs.get(country.slug)

		if (!translation) {
			if (occupiedBy && occupiedBy !== country.code) {
				conflicts.push({
					entity: 'country_translation',
					key: `en:${country.code}`,
					reason: `English slug "${country.slug}" is already used by ${occupiedBy}.`,
				})
			} else {
				create.countryTranslations.push(country)
			}
		} else if (
			translation.name !== country.englishName ||
			translation.slug !== country.slug
		) {
			conflicts.push({
				entity: 'country_translation',
				key: `en:${country.code}`,
				reason: 'Existing English reference name or slug differs; human-authored values will not be overwritten.',
			})
		} else {
			skipped.push({
				entity: 'country_translation',
				key: `en:${country.code}`,
			})
		}
	}

	return {
		create,
		update,
		skipped,
		conflicts,
		counts: {
			created: Object.values(create).reduce(
				(total, records) => total + records.length,
				0,
			),
			updated: Object.values(update).reduce(
				(total, records) => total + records.length,
				0,
			),
			skipped: skipped.length,
			conflicting: conflicts.length,
		},
	}
}

export function emptyExistingState() {
	return {
		regions: [],
		regionTranslations: [],
		countries: [],
		countryTranslations: [],
	}
}

export function matchingExistingState(catalogue) {
	const regions = catalogue.regions.map((region, index) => ({
		id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
		stable_key: region.stableKey,
		is_active: true,
	}))
	const regionIds = new Map(
		regions.map((region) => [region.stable_key, region.id]),
	)

	return {
		regions,
		regionTranslations: catalogue.regions.map((region) => ({
			region_id: regionIds.get(region.stableKey),
			locale: 'en',
			slug: region.slug,
			name: region.englishName,
			status: 'draft',
		})),
		countries: catalogue.countries.map((country) => ({
			code: country.code,
			region_id: country.regionKey
				? regionIds.get(country.regionKey)
				: null,
			is_covered: country.isCovered,
		})),
		countryTranslations: catalogue.countries.map((country) => ({
			country_code: country.code,
			locale: 'en',
			slug: country.slug,
			name: country.englishName,
			status: 'draft',
		})),
	}
}

export function baselineCountryTranslation(country, regionId) {
	return {
		country_code: country.code,
		locale: 'en',
		slug: country.slug,
		name: country.englishName,
		content: EMPTY_DOCUMENT,
		status: 'draft',
		regionId,
	}
}

function numericIdentifier(value) {
	const normalized = String(value ?? '')
	if (!/^\d{1,3}$/.test(normalized)) return null
	return normalized.padStart(3, '0')
}

function duplicates(values) {
	return [...groupBy(values, (value) => value)]
		.filter(([, matches]) => matches.length > 1)
		.map(([value]) => value)
}

function groupBy(values, keyForValue) {
	const groups = new Map()

	for (const value of values) {
		const key = keyForValue(value)
		groups.set(key, [...(groups.get(key) ?? []), value])
	}

	return groups
}
