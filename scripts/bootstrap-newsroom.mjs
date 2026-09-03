import { createClient } from '@supabase/supabase-js'

import {
	buildNewsroomCatalogue,
	createNewsroomPlan,
	loadNewsroomInputs,
	validateNewsroomCatalogue,
} from './lib/newsroom-bootstrap.mjs'

const allowedArguments = new Set(['--apply', '--dry-run', '--help'])
const argumentsList = process.argv.slice(2)
const unknownArguments = argumentsList.filter((argument) => !allowedArguments.has(argument))

if (argumentsList.includes('--help')) {
	console.log(`Usage: npm run newsroom:bootstrap -- [--dry-run | --apply]

Dry-run is the default. It validates the two active legacy newsroom articles,
authors, tags, local covers, Storage, and hosted records without changing them.
--apply performs only the reported non-destructive creates.`)
	process.exit(0)
}

if (unknownArguments.length || (argumentsList.includes('--apply') && argumentsList.includes('--dry-run'))) {
	console.error(unknownArguments.length ? `Unknown argument(s): ${unknownArguments.join(', ')}` : 'Choose either --dry-run or --apply, not both.')
	process.exit(1)
}

const applyMode = argumentsList.includes('--apply')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !secretKey) {
	console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local. No credentials were printed.')
	process.exit(1)
}

const inputs = await loadNewsroomInputs({
	configPath: new URL('./data/newsroom-bootstrap.json', import.meta.url),
	legacyNewsPath: new URL('../src/data/news.js', import.meta.url),
	mediaDirectory: new URL('../public/newsroom/', import.meta.url),
})
const catalogue = buildNewsroomCatalogue(inputs)
const validation = validateNewsroomCatalogue(catalogue)
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
const existing = await fetchExistingState(supabase)
const plan = createNewsroomPlan(catalogue, existing)

console.log(formatReport({ applyMode, catalogue, existing, plan, validation }))

if (!applyMode) {
	console.log('\nDRY RUN ONLY: no hosted records or Storage objects were changed.')
	process.exit(validation.issues.length || plan.conflicts.length ? 2 : 0)
}

if (validation.issues.length || plan.conflicts.length) {
	console.error('\nApply refused because the dry run contains validation failures or hosted-data conflicts.')
	process.exit(2)
}

await applyPlan({ supabase, catalogue, plan })
console.log(`\nAPPLY COMPLETE: created ${plan.counts.created}, skipped ${plan.counts.skipped}, conflicting ${plan.counts.conflicting}.`)

async function fetchExistingState(client) {
	const queries = await Promise.all([
		client.from('articles').select('id, stable_key, kind, cover_media_id, external_media_url'),
		client.from('article_translations').select('article_id, locale, slug, title, excerpt, content, sources, status, published_at'),
		client.from('people').select('id, stable_key, display_name, email, is_team_member, is_author, is_active'),
		client.from('people_translations').select('person_id, locale, slug, status, published_at'),
		client.from('tags').select('id, stable_key, is_active'),
		client.from('tag_translations').select('tag_id, locale, slug, name, status, published_at'),
		client.from('media_assets').select('id, bucket_id, object_path, mime_type, file_size_bytes, width, height, checksum, is_public'),
		client.from('media_asset_translations').select('media_asset_id, locale, alt_text'),
		client.from('article_authors').select('article_id, person_id, display_order'),
		client.from('article_tags').select('article_id, tag_id'),
	])
	const names = ['articles', 'article translations', 'people', 'people translations', 'tags', 'tag translations', 'media assets', 'media translations', 'article authors', 'article tags']
	const failureIndex = queries.findIndex((query) => query.error)
	if (failureIndex !== -1) throw new Error(`Unable to read hosted ${names[failureIndex]}: ${queries[failureIndex].error.message}`)

	const { data: stored, error: storageError } = await client.storage.from('public-media').list('newsroom/legacy', { limit: 100 })
	if (storageError) throw new Error(`Unable to inspect newsroom Storage: ${storageError.message}`)

	return {
		articles: queries[0].data ?? [], articleTranslations: queries[1].data ?? [],
		people: queries[2].data ?? [], peopleTranslations: queries[3].data ?? [],
		tags: queries[4].data ?? [], tagTranslations: queries[5].data ?? [],
		mediaAssets: queries[6].data ?? [], mediaTranslations: queries[7].data ?? [],
		articleAuthors: queries[8].data ?? [], articleTags: queries[9].data ?? [],
		storageObjects: (stored ?? []).filter((object) => object.id).map((object) => ({ objectPath: `newsroom/legacy/${object.name}`, size: Number(object.metadata?.size ?? 0) })),
	}
}

async function applyPlan({ supabase: client, catalogue: reference, plan: importPlan }) {
	for (const article of importPlan.create.storageObjects) {
		const { error } = await client.storage.from('public-media').upload(article.cover.objectPath, article.cover.bytes, { cacheControl: '3600', contentType: article.cover.mimeType, upsert: false })
		if (error) throw new Error(`Unable to upload ${article.cover.objectPath}: ${error.message}`)
	}
	if (importPlan.create.mediaAssets.length) await insert(client, 'media_assets', importPlan.create.mediaAssets.map(({ cover }) => ({ bucket_id: 'public-media', object_path: cover.objectPath, original_filename: cover.filename, mime_type: cover.mimeType, file_size_bytes: cover.size, width: cover.width, height: cover.height, checksum: cover.checksum, is_public: true })))

	let state = await resolveIds(client)
	if (importPlan.create.mediaTranslations.length) await insert(client, 'media_asset_translations', importPlan.create.mediaTranslations.map(({ cover }) => ({ media_asset_id: required(state.media, cover.objectPath), locale: 'en', alt_text: cover.alt })))
	if (importPlan.create.people.length) await insert(client, 'people', importPlan.create.people.map((person) => ({ stable_key: person.stableKey, display_name: person.displayName, email: person.email, is_team_member: false, is_author: true, is_active: true })))
	state = await resolveIds(client)
	const baselinePublishedAt = reference.articles.map((article) => article.publishedAt).sort()[0]
	if (importPlan.create.peopleTranslations.length) await insert(client, 'people_translations', importPlan.create.peopleTranslations.map((person) => ({ person_id: required(state.people, person.stableKey), locale: 'en', slug: person.slug, status: 'published', published_at: baselinePublishedAt })))
	if (importPlan.create.tags.length) await insert(client, 'tags', importPlan.create.tags.map((tag, index) => ({ stable_key: tag.stableKey, display_order: index, is_active: true })))
	state = await resolveIds(client)
	if (importPlan.create.tagTranslations.length) await insert(client, 'tag_translations', importPlan.create.tagTranslations.map((tag) => ({ tag_id: required(state.tags, tag.stableKey), locale: 'en', slug: tag.stableKey, name: tag.name, status: 'published', published_at: baselinePublishedAt })))
	if (importPlan.create.articles.length) await insert(client, 'articles', importPlan.create.articles.map((article) => ({ stable_key: article.stableKey, kind: 'article', cover_media_id: required(state.media, article.cover.objectPath), external_media_url: null, is_featured: false, featured_order: article.displayOrder })))
	state = await resolveIds(client)
	if (importPlan.create.articleTranslations.length) await insert(client, 'article_translations', importPlan.create.articleTranslations.map((article) => ({ article_id: required(state.articles, article.stableKey), locale: 'en', slug: article.slug, title: article.title, excerpt: article.excerpt, content: article.content, sources: article.sources, status: 'published', published_at: article.publishedAt })))
	if (importPlan.create.articleAuthors.length) await insert(client, 'article_authors', importPlan.create.articleAuthors.map((relation) => ({ article_id: required(state.articles, relation.articleKey), person_id: required(state.people, relation.authorKey), display_order: relation.displayOrder })))
	if (importPlan.create.articleTags.length) await insert(client, 'article_tags', importPlan.create.articleTags.map((relation) => ({ article_id: required(state.articles, relation.articleKey), tag_id: required(state.tags, relation.tagKey) })))
}

async function resolveIds(client) {
	const [media, people, tags, articles] = await Promise.all([
		client.from('media_assets').select('id, object_path').eq('bucket_id', 'public-media'),
		client.from('people').select('id, stable_key'), client.from('tags').select('id, stable_key'), client.from('articles').select('id, stable_key'),
	])
	const failed = [media, people, tags, articles].find((query) => query.error)
	if (failed) throw new Error(`Unable to resolve created records: ${failed.error.message}`)
	return {
		media: new Map((media.data ?? []).map((row) => [row.object_path, row.id])), people: new Map((people.data ?? []).map((row) => [row.stable_key, row.id])),
		tags: new Map((tags.data ?? []).map((row) => [row.stable_key, row.id])), articles: new Map((articles.data ?? []).map((row) => [row.stable_key, row.id])),
	}
}

async function insert(client, table, rows) {
	const { error } = await client.from(table).insert(rows)
	if (error) throw new Error(`Unable to create ${table}: ${error.message}`)
}

function required(map, key) { const id = map.get(key); if (!id) throw new Error(`Unable to resolve ${key}.`); return id }

function formatReport({ applyMode: applying, catalogue, existing, plan, validation }) {
	const createLines = Object.entries(plan.create).map(([entity, rows]) => `- ${entity}: ${rows.length}`)
	return [
		'NEWSROOM LEGACY BOOTSTRAP', `Mode: ${applying ? 'APPLY (pre-apply report)' : 'DRY RUN (default)'}`, `Reference version: ${catalogue.version}`, '',
		'REFERENCE SCOPE', `- Active legacy articles: ${catalogue.articles.length}`, `- Authors: ${catalogue.authors.length}`, `- Tags: ${catalogue.tags.length}`, `- Managed covers: ${catalogue.articles.length}`,
		`- Articles: ${catalogue.articles.map((article) => article.slug).join(', ')}`, `- Inline images omitted by the controlled document contract: ${catalogue.articles.flatMap((article) => article.omittedInlineImages).join(', ') || 'none'}`, '',
		'LOCAL VALIDATION', `- Issues: ${validation.issues.length}${validation.issues.length ? ` [${validation.issues.join('; ')}]` : ''}`, '',
		'HOSTED SNAPSHOT (READ ONLY)', `- Articles / translations: ${existing.articles.length} / ${existing.articleTranslations.length}`, `- People / translations: ${existing.people.length} / ${existing.peopleTranslations.length}`, `- Tags / translations: ${existing.tags.length} / ${existing.tagTranslations.length}`, `- Media / translations / stored objects: ${existing.mediaAssets.length} / ${existing.mediaTranslations.length} / ${existing.storageObjects.length}`, '',
		'PROPOSED CREATES', ...createLines, `- Total creates: ${plan.counts.created}`, `- Skipped: ${plan.counts.skipped}`, `- Conflicts: ${plan.counts.conflicting}${plan.conflicts.length ? ` [${plan.conflicts.map((item) => `${item.entity} ${item.key}: ${item.reason}`).join('; ')}]` : ''}`, '',
		'SAFETY AND PUBLICATION', '- Creates only the checked-in English newsroom baseline and its exact relationships.', '- Existing records are never overwritten; any mismatch blocks apply.', '- Articles, author-name translations, tag translations, and cover alt text are published in English only.', '- Services, sectors, related articles, SEO fields, other locales, team biographies, and inline body images are not invented.',
	].join('\n')
}
