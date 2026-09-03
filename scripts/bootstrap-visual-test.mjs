import { createClient } from '@supabase/supabase-js'

import { createVisualTestPlan, loadVisualTestCatalogue, validateVisualTestCatalogue } from './lib/visual-test-bootstrap.mjs'

const args = process.argv.slice(2)
const allowed = new Set(['--apply', '--dry-run', '--help'])
const unknown = args.filter((argument) => !allowed.has(argument))

if (args.includes('--help')) {
	console.log(`Usage: npm run visual-test:bootstrap -- [--dry-run | --apply]

Dry-run is the default. It validates and plans the selected legacy team,
services, sectors, media, contacts, and newsroom links without changing hosted
data. --apply performs only the reported creates and safe author-profile
promotions.`)
	process.exit(0)
}

if (unknown.length || (args.includes('--apply') && args.includes('--dry-run'))) {
	console.error(unknown.length ? `Unknown argument(s): ${unknown.join(', ')}` : 'Choose either --dry-run or --apply, not both.')
	process.exit(1)
}

const applyMode = args.includes('--apply')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.')

const catalogue = await loadVisualTestCatalogue({
	configPath: new URL('./data/visual-test-bootstrap.json', import.meta.url),
	teamPath: new URL('../src/data/team.js', import.meta.url),
	publicDirectory: new URL('../public/', import.meta.url),
})
const validation = validateVisualTestCatalogue(catalogue)
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const existing = await fetchState(supabase)
const plan = createVisualTestPlan(catalogue, existing)
console.log(report({ applyMode, catalogue, existing, plan, validation }))

if (!applyMode) {
	console.log('\nDRY RUN ONLY: no hosted records or Storage objects were changed.')
	process.exit(validation.issues.length || plan.conflicts.length ? 2 : 0)
}
if (validation.issues.length || plan.conflicts.length) {
	console.error('\nApply refused because validation issues or hosted-data conflicts exist.')
	process.exit(2)
}

await applyPlan(supabase, catalogue, plan)
console.log(`\nAPPLY COMPLETE: created ${plan.counts.created}, updated ${plan.counts.updated}, skipped ${plan.counts.skipped}, conflicting ${plan.counts.conflicting}.`)

async function fetchState(client) {
	const specs = [
		['people', 'id, stable_key, display_name, email, is_team_member, is_author, is_active, team_group, display_order, portrait_media_id'],
		['people_translations', 'person_id, locale, slug, short_bio, profile_document, status, published_at'],
		['people_profile_roles', 'person_id, locale, title, card_label, display_order, is_card_role'],
		['services', 'id, stable_key, icon_media_id, display_order, is_active'],
		['service_translations', 'service_id, locale, slug, name, summary, content, status, published_at'],
		['sectors', 'id, stable_key, icon_media_id, display_order, is_active'],
		['sector_translations', 'sector_id, locale, slug, name, summary, content, status, published_at'],
		['media_assets', 'id, bucket_id, object_path, mime_type, file_size_bytes, checksum, is_public'],
		['media_asset_translations', 'media_asset_id, locale, alt_text'],
		['service_people', 'service_id, person_id, relationship, display_order'],
		['sector_people', 'sector_id, person_id, relationship, display_order'],
		['articles', 'id, stable_key'],
		['article_sectors', 'article_id, sector_id'],
	]
	const results = await Promise.all(specs.map(([table, fields]) => client.from(table).select(fields)))
	const failed = results.findIndex((result) => result.error)
	if (failed !== -1) throw new Error(`Unable to read hosted ${specs[failed][0]}: ${results[failed].error.message}`)
	const [teamObjects, sectorObjects] = await Promise.all([
		client.storage.from('public-media').list('visual-test/team', { limit: 100 }),
		client.storage.from('public-media').list('visual-test/sectors', { limit: 100 }),
	])
	if (teamObjects.error || sectorObjects.error) throw new Error(`Unable to inspect visual-test Storage: ${teamObjects.error?.message ?? sectorObjects.error?.message}`)
	const storageObjects = [
		...(teamObjects.data ?? []).filter((item) => item.id).map((item) => ({ objectPath: `visual-test/team/${item.name}`, size: Number(item.metadata?.size ?? 0) })),
		...(sectorObjects.data ?? []).filter((item) => item.id).map((item) => ({ objectPath: `visual-test/sectors/${item.name}`, size: Number(item.metadata?.size ?? 0) })),
	]
	const names = ['people', 'peopleTranslations', 'peopleRoles', 'services', 'serviceTranslations', 'sectors', 'sectorTranslations', 'mediaAssets', 'mediaTranslations', 'servicePeople', 'sectorPeople', 'articles', 'articleSectors']
	return Object.fromEntries([...names.map((name, index) => [name, results[index].data ?? []]), ['storageObjects', storageObjects]])
}

async function applyPlan(client, reference, importPlan) {
	for (const media of importPlan.create.storageObjects) {
		const { error } = await client.storage.from('public-media').upload(media.objectPath, media.bytes, { cacheControl: '3600', contentType: media.mimeType, upsert: false })
		if (error) throw new Error(`Unable to upload ${media.objectPath}: ${error.message}`)
	}
	await insert(client, 'media_assets', importPlan.create.mediaAssets.map((media) => ({ bucket_id: 'public-media', object_path: media.objectPath, original_filename: media.filename, mime_type: media.mimeType, file_size_bytes: media.size, checksum: media.checksum, is_public: true })))
	let ids = await resolveIds(client)
	await insert(client, 'media_asset_translations', importPlan.create.mediaTranslations.map((media) => ({ media_asset_id: required(ids.media, media.objectPath), locale: 'en', alt_text: media.alt })))
	await insert(client, 'people', importPlan.create.people.map((person) => personRow(person, ids)))
	ids = await resolveIds(client)
	for (const person of importPlan.update.people) {
		const { data, error } = await client.from('people').update(personPresentation(person, ids)).eq('id', required(ids.people, person.stableKey)).select('id')
		if (error || data?.length !== 1) throw new Error(`Unable to promote ${person.stableKey} to the visual-test team: ${error?.message ?? 'record changed'}`)
	}
	await insert(client, 'people_translations', importPlan.create.peopleTranslations.map((person) => personTranslationRow(person, reference.publishedAt, ids)))
	for (const person of importPlan.update.peopleTranslations) {
		const { data, error } = await client.from('people_translations').update({ short_bio: person.shortBio, profile_document: person.profileDocument, published_at: reference.publishedAt }).eq('person_id', required(ids.people, person.stableKey)).eq('locale', 'en').select('person_id')
		if (error || data?.length !== 1) throw new Error(`Unable to expand ${person.stableKey}'s English profile: ${error?.message ?? 'record changed'}`)
	}
	await insert(client, 'people_profile_roles', importPlan.create.peopleRoles.map((role) => ({ person_id: required(ids.people, role.personKey), locale: 'en', title: role.title, card_label: role.cardLabel, display_order: role.displayOrder, is_card_role: role.isCardRole })))
	await insert(client, 'services', importPlan.create.services.map((entry) => ({ stable_key: entry.stableKey, display_order: entry.displayOrder, is_active: true })))
	await insert(client, 'sectors', importPlan.create.sectors.map((entry) => ({ stable_key: entry.stableKey, icon_media_id: entry.icon ? required(ids.media, entry.icon.objectPath) : null, display_order: entry.displayOrder, is_active: true })))
	ids = await resolveIds(client)
	await insert(client, 'service_translations', importPlan.create.serviceTranslations.map((entry) => translationRow('service_id', required(ids.services, entry.stableKey), entry, reference.publishedAt)))
	await insert(client, 'sector_translations', importPlan.create.sectorTranslations.map((entry) => translationRow('sector_id', required(ids.sectors, entry.stableKey), entry, reference.publishedAt)))
	await insert(client, 'service_people', importPlan.create.servicePeople.map((relation) => ({ service_id: required(ids.services, relation.service), person_id: required(ids.people, relation.person), relationship: 'contact', display_order: 0 })))
	await insert(client, 'sector_people', importPlan.create.sectorPeople.map((relation) => ({ sector_id: required(ids.sectors, relation.sector), person_id: required(ids.people, relation.person), relationship: 'contact', display_order: 0 })))
	await insert(client, 'article_sectors', importPlan.create.articleSectors.map((relation) => ({ article_id: required(ids.articles, relation.article), sector_id: required(ids.sectors, relation.sector) })))
}

function personRow(person, ids) { return { stable_key: person.stableKey, display_name: person.displayName, email: person.email, portrait_media_id: required(ids.media, person.portrait.objectPath), is_team_member: true, is_author: person.isAuthor, is_active: true, team_group: person.teamGroup, display_order: person.displayOrder } }
function personPresentation(person, ids) { return { portrait_media_id: required(ids.media, person.portrait.objectPath), is_team_member: true, team_group: person.teamGroup, display_order: person.displayOrder } }
function personTranslationRow(person, publishedAt, ids) { return { person_id: required(ids.people, person.stableKey), locale: 'en', slug: person.slug, short_bio: person.shortBio, profile_document: person.profileDocument, status: 'published', published_at: publishedAt } }
function translationRow(key, id, entry, publishedAt) { return { [key]: id, locale: 'en', slug: entry.slug, name: entry.name, summary: entry.summary, content: entry.content, status: 'published', published_at: publishedAt } }

async function insert(client, table, rows) { if (!rows.length) return; const { error } = await client.from(table).insert(rows); if (error) throw new Error(`Unable to create ${table}: ${error.message}`) }
async function resolveIds(client) {
	const specs = [['media_assets', 'id, object_path'], ['people', 'id, stable_key'], ['services', 'id, stable_key'], ['sectors', 'id, stable_key'], ['articles', 'id, stable_key']]
	const results = await Promise.all(specs.map(([table, fields]) => client.from(table).select(fields)))
	const failed = results.find((result) => result.error)
	if (failed) throw new Error(`Unable to resolve visual-test records: ${failed.error.message}`)
	return { media: map(results[0].data, 'object_path'), people: map(results[1].data, 'stable_key'), services: map(results[2].data, 'stable_key'), sectors: map(results[3].data, 'stable_key'), articles: map(results[4].data, 'stable_key') }
}
function map(rows, key) { return new Map((rows ?? []).map((row) => [row[key], row.id])) }
function required(values, key) { const value = values.get(key); if (!value) throw new Error(`Unable to resolve ${key}.`); return value }

function report({ applyMode, catalogue, existing, plan, validation }) {
	return [
		'VISUAL-TEST CONTENT BOOTSTRAP', `Mode: ${applyMode ? 'APPLY (pre-apply report)' : 'DRY RUN (default)'}`, `Reference version: ${catalogue.version}`, '',
		'REFERENCE SCOPE', `- Team profiles: ${catalogue.people.length} (2 managing team, 3 team)`, `- Services: ${catalogue.services.length}`, `- Sectors: ${catalogue.sectors.length}`, `- Managed media: ${catalogue.people.length + catalogue.sectors.filter((sector) => sector.icon).length}`, `- Contact relationships: ${catalogue.serviceContacts.length + catalogue.sectorContacts.length}`, `- Newsroom-sector relationships: ${catalogue.articleSectors.length}`, '',
		'LOCAL VALIDATION', `- Issues: ${validation.issues.length}${validation.issues.length ? ` [${validation.issues.join('; ')}]` : ''}`, '',
		'HOSTED SNAPSHOT (READ ONLY)', `- People / translations / roles: ${existing.people.length} / ${existing.peopleTranslations.length} / ${existing.peopleRoles.length}`, `- Services / translations: ${existing.services.length} / ${existing.serviceTranslations.length}`, `- Sectors / translations: ${existing.sectors.length} / ${existing.sectorTranslations.length}`, `- Media / translations / visual-test stored objects: ${existing.mediaAssets.length} / ${existing.mediaTranslations.length} / ${existing.storageObjects.length}`, '',
		'PROPOSED OPERATIONS', ...Object.entries(plan.create).map(([name, rows]) => `- Create ${name}: ${rows.length}`), ...Object.entries(plan.update).map(([name, rows]) => `- Update ${name}: ${rows.length}`), `- Total creates: ${plan.counts.created}`, `- Total safe updates: ${plan.counts.updated}`, `- Skipped: ${plan.counts.skipped}`, `- Conflicts: ${plan.counts.conflicting}${plan.conflicts.length ? ` [${plan.conflicts.map((item) => `${item.entity} ${item.key}: ${item.reason}`).join('; ')}]` : ''}`, '',
		'SAFETY AND PUBLICATION', '- Publishes only the selected English legacy visual-test baseline.', '- Existing author-only records may be promoted only when they still match the Newsroom bootstrap baseline.', '- Human-authored profile or catalogue differences block apply and are never overwritten.', '- No non-English content, SEO copy, or unsupported legacy records are invented.',
	].join('\n')
}
