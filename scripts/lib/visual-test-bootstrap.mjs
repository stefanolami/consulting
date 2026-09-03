import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const EMPTY_DOCUMENT = { type: 'doc', content: [] }
const EMPTY_PROFILE = { version: 1, intro: { content: EMPTY_DOCUMENT }, sections: [] }

export async function loadVisualTestCatalogue({ configPath, teamPath, publicDirectory }) {
	const [configText, teamSource] = await Promise.all([readFile(configPath, 'utf8'), readFile(teamPath, 'utf8')])
	const config = JSON.parse(configText)
	const legacy = parseLegacyTeam(teamSource)
	const people = []

	for (const [group, keys] of Object.entries(config.team)) {
		for (const [displayOrder, key] of keys.entries()) {
			const source = legacy[group]?.[key]
			if (!source) throw new Error(`Legacy team record ${group}.${key} is unavailable.`)
			const filename = source.img.replace(/^\/team\//, '')
			people.push({
				stableKey: source.path,
				displayName: clean(source.name),
				email: clean(source.contact?.email) || null,
				isAuthor: ['omar-cutajar', 'guilherme-ferreira', 'mathias-gerstner'].includes(source.path),
				teamGroup: group === 'managingTeam' ? 'managing_team' : 'team',
				displayOrder,
				slug: source.path,
				shortBio: (source.introduction ?? []).map(clean).filter(Boolean).join('\n\n'),
				profileDocument: profileDocument(source),
				roles: (source.titles ?? []).map((title, index) => ({ title: clean(title), cardLabel: index === 0 ? clean(source.imgTitle) || null : null, displayOrder: index, isCardRole: index === 0 })),
				portrait: await asset(new URL(`team/${filename}`, publicDirectory), `visual-test/team/${filename}`, mimeType(filename), `Portrait of ${clean(source.imgName) || clean(source.name)}.`),
			})
		}
	}

	const sectors = await Promise.all(config.sectors.map(async (entry, displayOrder) => ({
		...catalogueEntry(entry, displayOrder),
		icon: entry.icon ? await asset(new URL(`sectors/${entry.icon}`, publicDirectory), `visual-test/sectors/${entry.icon}`, mimeType(entry.icon), `${entry.title} sector icon.`) : null,
	})))

	return {
		version: config.version,
		locale: config.locale,
		publishedAt: config.publishedAt,
		people,
		services: config.services.map(catalogueEntry),
		sectors,
		serviceContacts: config.serviceContacts,
		sectorContacts: config.sectorContacts,
		articleSectors: config.articleSectors,
	}
}

export function parseLegacyTeam(source) {
	const transformed = source.replaceAll('export const ', 'const ')
	return JSON.parse(JSON.stringify(vm.runInNewContext(`${transformed};({ managingTeam, team })`, Object.create(null), { timeout: 1_000 })))
}

export function validateVisualTestCatalogue(catalogue) {
	const issues = []
	if (catalogue.locale !== 'en') issues.push('The visual-test baseline must use English.')
	if (catalogue.people.length !== 5) issues.push(`Expected 5 selected team records; found ${catalogue.people.length}.`)
	if (catalogue.services.length !== 6 || catalogue.sectors.length !== 6) issues.push('Expected six visual-test services and six sectors.')
	for (const duplicate of duplicates(catalogue.people.map((person) => person.stableKey))) issues.push(`Duplicate person: ${duplicate}.`)
	for (const entry of [...catalogue.services, ...catalogue.sectors]) if (!entry.summary) issues.push(`${entry.stableKey} has no legacy summary.`)
	return { issues }
}

export function profileDocument(source) {
	return {
		version: 1,
		intro: {
			content: richText(source.introduction),
			...(source.introductionEndorsement ? { endorsement: endorsement(source.introductionEndorsement) } : {}),
		},
		sections: (source.paragraphs ?? []).map((section, index) => ({
			id: deterministicUuid(`${source.path}:section:${index}`),
			title: clean(section.title),
			content: richText(section.content),
			...(section.endorsement ? { endorsement: endorsement(section.endorsement) } : {}),
		})),
	}
}

export function emptyVisualTestState() {
	return { people: [], peopleTranslations: [], peopleRoles: [], services: [], serviceTranslations: [], sectors: [], sectorTranslations: [], mediaAssets: [], mediaTranslations: [], storageObjects: [], servicePeople: [], sectorPeople: [], articles: [], articleSectors: [] }
}

export function createVisualTestPlan(catalogue, existing) {
	const create = { storageObjects: [], mediaAssets: [], mediaTranslations: [], people: [], peopleTranslations: [], peopleRoles: [], services: [], serviceTranslations: [], sectors: [], sectorTranslations: [], servicePeople: [], sectorPeople: [], articleSectors: [] }
	const update = { people: [], peopleTranslations: [] }
	const skipped = []
	const conflicts = []
	const by = (rows, key) => new Map(rows.map((row) => [key(row), row]))
	const media = by(existing.mediaAssets, (row) => row.object_path)
	const mediaById = by(existing.mediaAssets, (row) => row.id)
	const mediaTranslations = by(existing.mediaTranslations.filter((row) => row.locale === 'en'), (row) => mediaById.get(row.media_asset_id)?.object_path)
	const storage = by(existing.storageObjects, (row) => row.objectPath)
	const people = by(existing.people, (row) => row.stable_key)
	const peopleById = by(existing.people, (row) => row.id)
	const peopleTranslations = by(existing.peopleTranslations.filter((row) => row.locale === 'en'), (row) => peopleById.get(row.person_id)?.stable_key)
	const rolesByPerson = group(existing.peopleRoles.filter((row) => row.locale === 'en'), (row) => peopleById.get(row.person_id)?.stable_key)

	for (const person of catalogue.people) {
		planAsset(person.portrait)
		const current = people.get(person.stableKey)
		if (!current) create.people.push(person)
		else if (!samePersonIdentity(current, person)) conflict('person', person.stableKey, 'Existing canonical identity differs from the legacy record.')
		else if (!samePersonPresentation(current, person, mediaById)) update.people.push(person)
		else skip('person', person.stableKey)

		const translation = peopleTranslations.get(person.stableKey)
		if (!translation) create.peopleTranslations.push(person)
		else if (samePersonTranslation(translation, person, catalogue.publishedAt)) skip('people_translation', `en:${person.stableKey}`)
		else if (isNewsroomAuthorBaseline(translation, person)) update.peopleTranslations.push(person)
		else conflict('people_translation', `en:${person.stableKey}`, 'Existing English profile differs and will not be overwritten.')

		const currentRoles = (rolesByPerson.get(person.stableKey) ?? []).sort((a, b) => a.display_order - b.display_order)
		if (!currentRoles.length) create.peopleRoles.push(...person.roles.map((role) => ({ ...role, personKey: person.stableKey })))
		else if (stableJson(currentRoles.map(roleShape)) !== stableJson(person.roles.map(expectedRoleShape))) conflict('people_roles', `en:${person.stableKey}`, 'Existing localized roles differ.')
		else skip('people_roles', `en:${person.stableKey}`)
	}

	planCatalogue('service', catalogue.services, existing.services, existing.serviceTranslations)
	planCatalogue('sector', catalogue.sectors, existing.sectors, existing.sectorTranslations)
	planRelations()

	return { create, update, skipped, conflicts, counts: { created: total(create), updated: total(update), skipped: skipped.length, conflicting: conflicts.length } }

	function planAsset(value) {
		if (!value) return
		const stored = storage.get(value.objectPath)
		if (!stored) create.storageObjects.push(value)
		else if (stored.size !== value.size) conflict('storage_object', value.objectPath, 'Stored file size differs.')
		else skip('storage_object', value.objectPath)
		const mediaRow = media.get(value.objectPath)
		if (!mediaRow) create.mediaAssets.push(value)
		else if (mediaRow.checksum !== value.checksum || Number(mediaRow.file_size_bytes) !== value.size || mediaRow.mime_type !== value.mimeType || !mediaRow.is_public) conflict('media_asset', value.objectPath, 'Existing media metadata differs.')
		else skip('media_asset', value.objectPath)
		const translation = mediaTranslations.get(value.objectPath)
		if (!translation) create.mediaTranslations.push(value)
		else if (translation.alt_text !== value.alt) conflict('media_translation', `en:${value.objectPath}`, 'Existing alt text differs.')
		else skip('media_translation', `en:${value.objectPath}`)
	}

	function planCatalogue(kind, entries, canonicalRows, translationRows) {
		const canonical = by(canonicalRows, (row) => row.stable_key)
		const canonicalById = by(canonicalRows, (row) => row.id)
		const translations = by(translationRows.filter((row) => row.locale === 'en'), (row) => canonicalById.get(row[`${kind}_id`])?.stable_key)
		for (const entry of entries) {
			planAsset(entry.icon)
			const current = canonical.get(entry.stableKey)
			if (!current) create[`${kind}s`].push(entry)
			else if (!current.is_active || current.display_order !== entry.displayOrder || (mediaById.get(current.icon_media_id)?.object_path ?? null) !== (entry.icon?.objectPath ?? null)) conflict(kind, entry.stableKey, 'Existing canonical presentation differs.')
			else skip(kind, entry.stableKey)
			const translation = translations.get(entry.stableKey)
			if (!translation) create[`${kind}Translations`].push(entry)
			else if (sameCatalogueTranslation(translation, entry, catalogue.publishedAt)) skip(`${kind}_translation`, `en:${entry.stableKey}`)
			else conflict(`${kind}_translation`, `en:${entry.stableKey}`, 'Existing English content differs.')
		}
	}

	function planRelations() {
		const services = by(existing.services, (row) => row.stable_key)
		const sectors = by(existing.sectors, (row) => row.stable_key)
		const articles = by(existing.articles, (row) => row.stable_key)
		for (const relation of catalogue.serviceContacts) relationPlan('servicePeople', relation, existing.servicePeople.some((row) => row.service_id === services.get(relation.service)?.id && row.person_id === people.get(relation.person)?.id && row.relationship === 'contact'))
		for (const relation of catalogue.sectorContacts) relationPlan('sectorPeople', relation, existing.sectorPeople.some((row) => row.sector_id === sectors.get(relation.sector)?.id && row.person_id === people.get(relation.person)?.id && row.relationship === 'contact'))
		for (const relation of catalogue.articleSectors) relationPlan('articleSectors', relation, existing.articleSectors.some((row) => row.article_id === articles.get(relation.article)?.id && row.sector_id === sectors.get(relation.sector)?.id))
	}

	function relationPlan(collection, relation, exists) { if (exists) skip(collection, Object.values(relation).join(':')); else create[collection].push(relation) }
	function skip(entity, key) { skipped.push({ entity, key }) }
	function conflict(entity, key, reason) { conflicts.push({ entity, key, reason }) }
}

function catalogueEntry(entry, displayOrder) { return { stableKey: entry.id, slug: entry.id, name: clean(entry.title), summary: clean(entry.excerpt), content: EMPTY_DOCUMENT, displayOrder } }
async function asset(path, objectPath, type, alt) { const bytes = await readFile(path); return { bytes, objectPath, filename: path.pathname.split('/').pop(), mimeType: type, alt, size: bytes.byteLength, checksum: createHash('sha256').update(bytes).digest('hex') } }
function mimeType(filename) { if (filename.endsWith('.png')) return 'image/png'; if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg'; throw new Error(`Unsupported visual-test media type: ${filename}`) }
function richText(values = []) { return { type: 'doc', content: values.map(clean).filter(Boolean).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) } }
function endorsement(value) { return { quote: (value.content ?? []).map(clean).join('\n\n'), ...(clean(value.name) ? { attribution: clean(value.name) } : {}), ...(clean(value.title) ? { role: clean(value.title) } : {}) } }
function deterministicUuid(value) { const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split(''); hex[12] = '5'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16); const joined = hex.join(''); return `${joined.slice(0,8)}-${joined.slice(8,12)}-${joined.slice(12,16)}-${joined.slice(16,20)}-${joined.slice(20)}` }
function samePersonIdentity(row, expected) { return row.display_name === expected.displayName && row.email === expected.email && row.is_author === expected.isAuthor && row.is_active }
function samePersonPresentation(row, expected, mediaById) { return row.is_team_member && row.team_group === expected.teamGroup && row.display_order === expected.displayOrder && mediaById.get(row.portrait_media_id)?.object_path === expected.portrait.objectPath }
function samePersonTranslation(row, expected, publishedAt) { return row.slug === expected.slug && row.short_bio === expected.shortBio && row.status === 'published' && new Date(row.published_at).toISOString() === publishedAt && stableJson(row.profile_document) === stableJson(expected.profileDocument) }
function isNewsroomAuthorBaseline(row, expected) { return expected.isAuthor && row.slug === expected.slug && row.status === 'published' && !row.short_bio && stableJson(row.profile_document) === stableJson(EMPTY_PROFILE) }
function sameCatalogueTranslation(row, expected, publishedAt) { return row.slug === expected.slug && row.name === expected.name && row.summary === expected.summary && row.status === 'published' && new Date(row.published_at).toISOString() === publishedAt && stableJson(row.content) === stableJson(expected.content) }
function roleShape(row) { return { title: row.title, cardLabel: row.card_label, displayOrder: row.display_order, isCardRole: row.is_card_role } }
function expectedRoleShape(row) { return { title: row.title, cardLabel: row.cardLabel, displayOrder: row.displayOrder, isCardRole: row.isCardRole } }
function stableJson(value) { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`; return JSON.stringify(value) }
function group(values, key) { const result = new Map(); for (const value of values) { const itemKey = key(value); result.set(itemKey, [...(result.get(itemKey) ?? []), value]) } return result }
function duplicates(values) { return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))] }
function total(collections) { return Object.values(collections).reduce((sum, rows) => sum + rows.length, 0) }
function clean(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '' }
