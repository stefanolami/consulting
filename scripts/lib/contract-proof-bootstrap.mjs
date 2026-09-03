import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const EMPTY_DOCUMENT = { type: 'doc', content: [] }

export async function loadContractProofCatalogue({ config, publicDirectory }) {
	const country = config.goldenCountry
	const global = config.globalProof
	const [flag, outline, partnerLogo] = await Promise.all([
		asset(new URL(`outreach/${country.flag.filename}`, publicDirectory), `visual-test/outreach/${country.flag.filename}`, country.flag.alt),
		asset(new URL(`outreach/${country.outline.filename}`, publicDirectory), `visual-test/outreach/${country.outline.filename}`, country.outline.alt),
		asset(new URL(`partners/${global.partner.logo.filename}`, publicDirectory), `visual-test/partners/${global.partner.logo.filename}`, global.partner.logo.alt),
	])
	return {
		locale: config.locale,
		publishedAt: config.publishedAt,
		country: {
			...country,
			content: sectionDocument(country.content),
			flag,
			outline,
			services: country.services.map((service, displayOrder) => ({
				...service,
				content: paragraphDocument(service.paragraphs),
				coverageLevel: null,
				displayOrder,
			})),
			statistic: { ...country.statistic, id: deterministicUuid(`country-statistic:${country.code}:${country.statistic.metricKey}`), displayOrder: 0 },
			offices: country.offices.map((office, displayOrder) => ({ ...office, id: deterministicUuid(`office:${office.stableKey}`), displayOrder })),
		},
		partner: { ...global.partner, id: deterministicUuid(`partner:${global.partner.stableKey}`), displayOrder: 0, logo: partnerLogo },
		endorsement: { ...global.endorsement, id: deterministicUuid(`endorsement:${global.endorsement.stableKey}`), displayOrder: 0 },
		siteSettings: global.siteSettings,
	}
}

export function validateContractProofCatalogue(catalogue) {
	const issues = []
	if (catalogue.locale !== 'en') issues.push('The contract proof must use English source material.')
	if (catalogue.country.code !== 'BR' || catalogue.country.offices.length !== 3) issues.push('The golden-country proof must contain the three legacy Brazil offices.')
	if (!catalogue.country.services.length || !catalogue.country.experts.length) issues.push('The golden country needs source-backed service and expert relationships.')
	for (const media of [catalogue.country.flag, catalogue.country.outline, catalogue.partner.logo]) {
		if (!media.bytes.length || !media.mimeType.startsWith('image/')) issues.push(`${media.objectPath} is not a usable managed image.`)
	}
	for (const value of [catalogue.partner.websiteUrl, ...catalogue.siteSettings.flatMap((setting) => setting.key === 'social_links' ? setting.value.items.map((item) => item.url) : [])]) {
		try { const protocol = new URL(value).protocol; if (!['http:', 'https:'].includes(protocol)) issues.push(`Unsafe public URL: ${value}`) }
		catch { issues.push(`Invalid public URL: ${value}`) }
	}
	return { issues }
}

export function emptyContractProofState() {
	return {
		countries: [], countryTranslations: [], countryServices: [], countryServiceTranslations: [], countryStatistics: [], countryStatisticTranslations: [],
		offices: [], officeTranslations: [], countryOffices: [], countryPeople: [], people: [], services: [], mediaAssets: [], mediaTranslations: [], storageObjects: [],
		partners: [], partnerTranslations: [], endorsements: [], endorsementTranslations: [], siteSettings: [],
	}
}

export function createContractProofPlan(catalogue, existing) {
	const create = Object.fromEntries([
		'storageObjects', 'mediaAssets', 'mediaTranslations', 'countryServices', 'countryServiceTranslations', 'countryStatistics', 'countryStatisticTranslations',
		'offices', 'officeTranslations', 'countryOffices', 'countryPeople', 'partners', 'partnerTranslations', 'endorsements', 'endorsementTranslations', 'siteSettings',
	].map((key) => [key, []]))
	const update = { countries: [], countryTranslations: [] }
	const skipped = []
	const conflicts = []
	const country = catalogue.country
	const by = (rows, key) => new Map(rows.map((row) => [key(row), row]))
	const media = by(existing.mediaAssets, (row) => row.object_path)
	const mediaById = by(existing.mediaAssets, (row) => row.id)
	const mediaTranslations = by(existing.mediaTranslations.filter((row) => row.locale === catalogue.locale), (row) => mediaById.get(row.media_asset_id)?.object_path)
	const storage = by(existing.storageObjects, (row) => row.objectPath)
	const services = by(existing.services, (row) => row.stable_key)
	const people = by(existing.people, (row) => row.stable_key)
	const offices = by(existing.offices, (row) => row.stable_key)
	const officeById = by(existing.offices, (row) => row.id)
	const officeTranslations = by(existing.officeTranslations.filter((row) => row.locale === catalogue.locale), (row) => officeById.get(row.office_id)?.stable_key)
	const partners = by(existing.partners, (row) => row.stable_key)
	const partnerById = by(existing.partners, (row) => row.id)
	const partnerTranslations = by(existing.partnerTranslations.filter((row) => row.locale === catalogue.locale), (row) => partnerById.get(row.partner_id)?.stable_key)
	const endorsements = by(existing.endorsements, (row) => row.stable_key)
	const endorsementById = by(existing.endorsements, (row) => row.id)
	const endorsementTranslations = by(existing.endorsementTranslations.filter((row) => row.locale === catalogue.locale), (row) => endorsementById.get(row.endorsement_id)?.stable_key)

	for (const value of [country.flag, country.outline, catalogue.partner.logo]) planAsset(value)
	planCountry()
	planCountryServices()
	planStatistic()
	planOffices()
	planExperts()
	planPartner()
	planEndorsement()
	planSiteSettings()

	return { create, update, skipped, conflicts, counts: { created: total(create), updated: total(update), skipped: skipped.length, conflicting: conflicts.length } }

	function planAsset(value) {
		const stored = storage.get(value.objectPath)
		if (!stored) create.storageObjects.push(value)
		else if (stored.size !== value.size) conflict('storage_object', value.objectPath, 'Stored file size differs.')
		else skip('storage_object', value.objectPath)
		const current = media.get(value.objectPath)
		if (!current) create.mediaAssets.push(value)
		else if (current.checksum !== value.checksum || Number(current.file_size_bytes) !== value.size || current.mime_type !== value.mimeType || !current.is_public) conflict('media_asset', value.objectPath, 'Existing managed-media metadata differs.')
		else skip('media_asset', value.objectPath)
		const translation = mediaTranslations.get(value.objectPath)
		if (!translation) create.mediaTranslations.push(value)
		else if (translation.alt_text !== value.alt || translation.caption !== null) conflict('media_translation', `en:${value.objectPath}`, 'Existing localized media metadata differs.')
		else skip('media_translation', `en:${value.objectPath}`)
	}

	function planCountry() {
		const current = existing.countries.find((row) => row.code === country.code)
		if (!current) return conflict('country', country.code, 'Run outreach:bootstrap first; the ISO country record is missing.')
		const flagPath = current.flag_media_id ? mediaById.get(current.flag_media_id)?.object_path : null
		const outlinePath = current.outline_media_id ? mediaById.get(current.outline_media_id)?.object_path : null
		if (!current.is_covered) return conflict('country', country.code, 'Brazil is not covered; the golden-country seed will not change editorial coverage.')
		if ((flagPath && flagPath !== country.flag.objectPath) || (outlinePath && outlinePath !== country.outline.objectPath) || (current.last_reviewed_on && current.last_reviewed_on !== country.lastReviewedOn)) {
			return conflict('country', country.code, 'Existing country media or review metadata differs and will not be overwritten.')
		}
		if (flagPath !== country.flag.objectPath || outlinePath !== country.outline.objectPath || current.last_reviewed_on !== country.lastReviewedOn) update.countries.push({ ...country, expectedUpdatedAt: current.updated_at })
		else skip('country', country.code)

		const translation = existing.countryTranslations.find((row) => row.country_code === country.code && row.locale === catalogue.locale)
		if (!translation) return conflict('country_translation', `en:${country.code}`, 'Run outreach:bootstrap first; the published English identity is missing.')
		if (sameCountryTranslation(translation, country)) skip('country_translation', `en:${country.code}`)
		else if (isCountryIdentityBaseline(translation, country)) update.countryTranslations.push({ ...country, expectedUpdatedAt: translation.updated_at })
		else conflict('country_translation', `en:${country.code}`, 'Existing country content differs from both the reference baseline and the golden proof.')
	}

	function planCountryServices() {
		for (const service of country.services) {
			const canonical = services.get(service.service)
			if (!canonical || !canonical.is_active) { conflict('country_service', `${country.code}:${service.service}`, 'The referenced active service is missing.'); continue }
			const relation = existing.countryServices.find((row) => row.country_code === country.code && row.service_id === canonical.id)
			if (!relation) create.countryServices.push(service)
			else if (relation.coverage_level !== null || relation.display_order !== service.displayOrder) conflict('country_service', `${country.code}:${service.service}`, 'Existing country-service relationship differs.')
			else skip('country_service', `${country.code}:${service.service}`)
			const translation = existing.countryServiceTranslations.find((row) => row.country_code === country.code && row.service_id === canonical.id && row.locale === catalogue.locale)
			if (!translation) create.countryServiceTranslations.push(service)
			else if (translation.summary === service.summary && stableJson(translation.content) === stableJson(service.content)) skip('country_service_translation', `en:${country.code}:${service.service}`)
			else conflict('country_service_translation', `en:${country.code}:${service.service}`, 'Existing localized service content differs.')
		}
	}

	function planStatistic() {
		const expected = country.statistic
		const current = existing.countryStatistics.find((row) => row.country_code === country.code && row.metric_key === expected.metricKey)
		if (!current) {
			create.countryStatistics.push(expected)
			create.countryStatisticTranslations.push(expected)
			return
		}
		if (Number(current.numeric_value) !== expected.numericValue || current.unit !== null || current.statistic_year !== null || current.source_url !== null || current.display_order !== expected.displayOrder) conflict('country_statistic', `${country.code}:${expected.metricKey}`, 'Existing statistic differs.')
		else skip('country_statistic', `${country.code}:${expected.metricKey}`)
		const translation = existing.countryStatisticTranslations.find((row) => row.statistic_id === current.id && row.locale === catalogue.locale)
		if (!translation) create.countryStatisticTranslations.push({ ...expected, id: current.id })
		else if (translation.label === expected.label && translation.display_value === expected.displayValue) skip('country_statistic_translation', `en:${country.code}:${expected.metricKey}`)
		else conflict('country_statistic_translation', `en:${country.code}:${expected.metricKey}`, 'Existing localized statistic differs.')
	}

	function planOffices() {
		for (const expected of country.offices) {
			const current = offices.get(expected.stableKey)
			if (!current) create.offices.push(expected)
			else if (current.country_code !== country.code || current.email !== expected.email || current.phone !== null || current.latitude !== null || current.longitude !== null || current.display_order !== expected.displayOrder || !current.is_active) conflict('office', expected.stableKey, 'Existing office differs from the legacy source.')
			else skip('office', expected.stableKey)
			const translation = officeTranslations.get(expected.stableKey)
			if (!translation) create.officeTranslations.push(expected)
			else if (translation.name === expected.name && translation.city === expected.city && translation.address === null && translation.status === 'published' && iso(translation.published_at) === catalogue.publishedAt) skip('office_translation', `en:${expected.stableKey}`)
			else conflict('office_translation', `en:${expected.stableKey}`, 'Existing localized office differs.')
			const officeId = current?.id
			const relation = officeId ? existing.countryOffices.find((row) => row.country_code === country.code && row.office_id === officeId) : null
			if (!relation) create.countryOffices.push(expected)
			else if (relation.display_order !== expected.displayOrder) conflict('country_office', `${country.code}:${expected.stableKey}`, 'Existing country-office order differs.')
			else skip('country_office', `${country.code}:${expected.stableKey}`)
		}
	}

	function planExperts() {
		for (const [displayOrder, stableKey] of country.experts.entries()) {
			const person = people.get(stableKey)
			if (!person || !person.is_active) { conflict('country_person', `${country.code}:${stableKey}`, 'The referenced active expert is missing.'); continue }
			const relation = existing.countryPeople.find((row) => row.country_code === country.code && row.person_id === person.id && row.relationship === 'expert')
			if (!relation) create.countryPeople.push({ stableKey, displayOrder })
			else if (relation.display_order !== displayOrder) conflict('country_person', `${country.code}:${stableKey}`, 'Existing expert order differs.')
			else skip('country_person', `${country.code}:${stableKey}`)
		}
	}

	function planPartner() {
		const expected = catalogue.partner
		const current = partners.get(expected.stableKey)
		const logoPath = current?.logo_media_id ? mediaById.get(current.logo_media_id)?.object_path : null
		if (!current) create.partners.push(expected)
		else if (current.name !== expected.name || current.website_url !== expected.websiteUrl || current.display_order !== expected.displayOrder || !current.is_active || logoPath !== expected.logo.objectPath) conflict('partner', expected.stableKey, 'Existing partner differs from the legacy proof.')
		else skip('partner', expected.stableKey)
		const translation = partnerTranslations.get(expected.stableKey)
		if (!translation) create.partnerTranslations.push(expected)
		else if (translation.alt_text === expected.logo.alt && translation.description === null && translation.status === 'published' && iso(translation.published_at) === catalogue.publishedAt) skip('partner_translation', `en:${expected.stableKey}`)
		else conflict('partner_translation', `en:${expected.stableKey}`, 'Existing localized partner content differs.')
	}

	function planEndorsement() {
		const expected = catalogue.endorsement
		const current = endorsements.get(expected.stableKey)
		const expectedPartnerId = partners.get(expected.partner)?.id
		if (!current) create.endorsements.push(expected)
		else if (current.attribution_name !== expected.attributionName || current.partner_id !== expectedPartnerId || current.portrait_media_id !== null || current.display_order !== expected.displayOrder || !current.is_active) conflict('endorsement', expected.stableKey, 'Existing endorsement differs from the legacy proof.')
		else skip('endorsement', expected.stableKey)
		const translation = endorsementTranslations.get(expected.stableKey)
		if (!translation) create.endorsementTranslations.push(expected)
		else if (translation.quote === expected.quote && translation.attribution_title === expected.attributionTitle && translation.status === 'published' && iso(translation.published_at) === catalogue.publishedAt) skip('endorsement_translation', `en:${expected.stableKey}`)
		else conflict('endorsement_translation', `en:${expected.stableKey}`, 'Existing localized endorsement differs.')
	}

	function planSiteSettings() {
		const settings = by(existing.siteSettings, (row) => row.key)
		for (const expected of catalogue.siteSettings) {
			const current = settings.get(expected.key)
			if (!current) create.siteSettings.push(expected)
			else if (!current.is_public || current.description !== expected.description || stableJson(current.value) !== stableJson(expected.value)) conflict('site_setting', expected.key, 'Existing site setting differs and will not be overwritten.')
			else skip('site_setting', expected.key)
		}
	}

	function skip(entity, key) { skipped.push({ entity, key }) }
	function conflict(entity, key, reason) { conflicts.push({ entity, key, reason }) }
}

function sectionDocument(sections) {
	return { type: 'doc', content: sections.flatMap((section) => [
		{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: clean(section.heading) }] },
		...section.paragraphs.map(paragraph),
	]) }
}
function paragraphDocument(values) { return { type: 'doc', content: values.map(paragraph) } }
function paragraph(value) { return { type: 'paragraph', content: [{ type: 'text', text: clean(value) }] } }
async function asset(path, objectPath, alt) {
	const bytes = await readFile(path)
	const filename = path.pathname.split('/').pop()
	return { id: deterministicUuid(`media:${objectPath}`), bytes, objectPath, filename, mimeType: mimeType(filename), alt, size: bytes.byteLength, checksum: createHash('sha256').update(bytes).digest('hex') }
}
function mimeType(filename) {
	if (filename.endsWith('.png')) return 'image/png'
	if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg'
	if (filename.endsWith('.svg')) return 'image/svg+xml'
	throw new Error(`Unsupported contract-proof media type: ${filename}`)
}
function sameCountryTranslation(row, expected) {
	return row.slug === expected.slug && row.name === expected.name && row.summary === expected.summary && row.coverage_summary === expected.coverageSummary && stableJson(row.content) === stableJson(expected.content) && row.seo_title === expected.seoTitle && row.seo_description === expected.seoDescription && row.status === 'published'
}
function isCountryIdentityBaseline(row, expected) {
	return row.slug === expected.slug && row.name === expected.name && row.summary === null && row.coverage_summary === null && stableJson(row.content) === stableJson(EMPTY_DOCUMENT) && row.seo_title === null && row.seo_description === null && row.status === 'published'
}
function deterministicUuid(value) { const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split(''); hex[12] = '5'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16); const joined = hex.join(''); return `${joined.slice(0,8)}-${joined.slice(8,12)}-${joined.slice(12,16)}-${joined.slice(16,20)}-${joined.slice(20)}` }
function stableJson(value) { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`; return JSON.stringify(value) }
function iso(value) { return value ? new Date(value).toISOString() : null }
function total(collections) { return Object.values(collections).reduce((sum, rows) => sum + rows.length, 0) }
function clean(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '' }
