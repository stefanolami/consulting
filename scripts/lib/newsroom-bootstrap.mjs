import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

export async function loadNewsroomInputs({ configPath, legacyNewsPath, mediaDirectory }) {
	const [configText, legacySource] = await Promise.all([
		readFile(configPath, 'utf8'),
		readFile(legacyNewsPath, 'utf8'),
	])
	const config = JSON.parse(configText)
	const legacyArticles = parseLegacyNews(legacySource)
	const assets = new Map()

	for (const article of config.articles) {
		const bytes = await readFile(new URL(article.cover.filename, mediaDirectory))
		assets.set(article.cover.filename, {
			bytes,
			checksum: createHash('sha256').update(bytes).digest('hex'),
			size: bytes.byteLength,
		})
	}

	return { assets, config, legacyArticles }
}

export function parseLegacyNews(source) {
	const declaration = source.indexOf('const NEWS')
	const exportStatement = source.lastIndexOf('export default NEWS')
	const arrayStart = source.indexOf('[', declaration)
	const arrayEnd = source.lastIndexOf(']', exportStatement)

	if (declaration === -1 || exportStatement === -1 || arrayStart === -1 || arrayEnd === -1) {
		throw new Error('Could not parse src/data/news.js. Expected a const NEWS array and default export.')
	}

	return Array.from(vm.runInNewContext(`(${source.slice(arrayStart, arrayEnd + 1)})`, Object.create(null), { timeout: 1_000 }))
}

export function buildNewsroomCatalogue({ assets, config, legacyArticles }) {
	const configBySlug = new Map(config.articles.map((article) => [article.slug, article]))
	const authorsByKey = new Map(config.authors.map((author) => [author.stableKey, author]))
	const articles = Array.from(legacyArticles, (legacy, displayOrder) => {
		const configured = configBySlug.get(legacy.slug)
		if (!configured) throw new Error(`Legacy article ${legacy.slug} has no bootstrap configuration.`)
		const asset = assets.get(configured.cover.filename)
		if (!asset) throw new Error(`Cover ${configured.cover.filename} could not be loaded.`)
		return {
			stableKey: legacy.slug,
			slug: legacy.slug,
			title: clean(legacy.title),
			excerpt: clean(legacy.intro),
			publishedAt: parseLegacyDate(legacy.date),
			displayOrder,
			tag: { stableKey: slugify(legacy.tag), name: clean(legacy.tag) },
			authorKeys: [...configured.authors],
			cover: {
				...configured.cover,
				objectPath: `newsroom/legacy/${configured.cover.filename}`,
				checksum: asset.checksum,
				size: asset.size,
				bytes: asset.bytes,
			},
			content: legacyArticleDocument(legacy),
			sources: Array.from(legacy.sources ?? [], sourceFromUrl),
			omittedInlineImages: Array.from(legacy.paragraphs ?? []).flatMap((paragraph) => paragraph.image ? [paragraph.image] : []),
		}
	})

	return {
		version: config.version,
		locale: config.locale,
		authors: config.authors.map((author) => ({ ...author, slug: author.stableKey })),
		tags: uniqueBy(articles.map((article) => article.tag), (tag) => tag.stableKey),
		articles,
		authorsByKey,
	}
}

export function validateNewsroomCatalogue(catalogue) {
	const issues = []
	if (catalogue.locale !== 'en') issues.push('The initial newsroom bootstrap must use the English locale.')
	if (catalogue.articles.length !== 2) issues.push(`Expected exactly 2 active legacy articles; found ${catalogue.articles.length}.`)
	for (const article of catalogue.articles) {
		if (!article.title || !article.excerpt || !article.content.content.length) issues.push(`${article.slug} is missing required editorial content.`)
		if (!article.sources.length) issues.push(`${article.slug} has no sources.`)
		if (!article.cover.alt || !article.cover.size || !article.cover.checksum) issues.push(`${article.slug} has incomplete cover metadata.`)
		for (const authorKey of article.authorKeys) {
			if (!catalogue.authorsByKey.has(authorKey)) issues.push(`${article.slug} references unknown author ${authorKey}.`)
		}
	}
	for (const duplicate of duplicates(catalogue.articles.map((article) => article.slug))) issues.push(`Duplicate article slug: ${duplicate}.`)
	for (const duplicate of duplicates(catalogue.authors.map((author) => author.stableKey))) issues.push(`Duplicate author key: ${duplicate}.`)
	return { issues }
}

export function emptyNewsroomState() {
	return {
		articles: [], articleTranslations: [], people: [], peopleTranslations: [], tags: [], tagTranslations: [],
		mediaAssets: [], mediaTranslations: [], articleAuthors: [], articleTags: [], storageObjects: [],
	}
}

export function createNewsroomPlan(catalogue, existing) {
	const create = {
		storageObjects: [], mediaAssets: [], mediaTranslations: [], people: [], peopleTranslations: [],
		tags: [], tagTranslations: [], articles: [], articleTranslations: [], articleAuthors: [], articleTags: [],
	}
	const skipped = []
	const conflicts = []
	const by = (rows, key) => new Map(rows.map((row) => [key(row), row]))
	const people = by(existing.people, (row) => row.stable_key)
	const peopleKeys = by(existing.people, (row) => row.id)
	const peopleTranslations = by(existing.peopleTranslations.filter((row) => row.locale === 'en'), (row) => peopleKeys.get(row.person_id)?.stable_key)
	const personSlugs = by(existing.peopleTranslations.filter((row) => row.locale === 'en'), (row) => row.slug)
	const tags = by(existing.tags, (row) => row.stable_key)
	const tagKeys = by(existing.tags, (row) => row.id)
	const tagTranslations = by(existing.tagTranslations.filter((row) => row.locale === 'en'), (row) => tagKeys.get(row.tag_id)?.stable_key)
	const tagSlugs = by(existing.tagTranslations.filter((row) => row.locale === 'en'), (row) => row.slug)
	const media = by(existing.mediaAssets, (row) => `${row.bucket_id}:${row.object_path}`)
	const mediaKeys = by(existing.mediaAssets, (row) => row.id)
	const mediaTranslations = by(existing.mediaTranslations.filter((row) => row.locale === 'en'), (row) => mediaKeys.get(row.media_asset_id)?.object_path)
	const storage = by(existing.storageObjects, (row) => row.objectPath)
	const articles = by(existing.articles, (row) => row.stable_key)
	const articleKeys = by(existing.articles, (row) => row.id)
	const articleTranslations = by(existing.articleTranslations.filter((row) => row.locale === 'en'), (row) => articleKeys.get(row.article_id)?.stable_key)
	const articleSlugs = by(existing.articleTranslations.filter((row) => row.locale === 'en'), (row) => row.slug)

	for (const author of catalogue.authors) {
		const current = people.get(author.stableKey)
		if (!current) create.people.push(author)
		else if (current.display_name !== author.displayName || current.email !== author.email || !current.is_author || !current.is_active) conflict('person', author.stableKey, 'Existing canonical person differs from the author baseline.')
		else skip('person', author.stableKey)
		const translation = peopleTranslations.get(author.stableKey)
		const occupied = personSlugs.get(author.slug)
		if (!translation) {
			if (occupied && occupied.person_id !== current?.id) conflict('people_translation', `en:${author.stableKey}`, `Slug ${author.slug} is already used.`)
			else create.peopleTranslations.push(author)
		} else if (translation.slug !== author.slug || translation.status !== 'published' || !translation.published_at) conflict('people_translation', `en:${author.stableKey}`, 'Existing English author translation differs from the published baseline.')
		else skip('people_translation', `en:${author.stableKey}`)
	}

	for (const tag of catalogue.tags) {
		const current = tags.get(tag.stableKey)
		if (!current) create.tags.push(tag)
		else if (!current.is_active) conflict('tag', tag.stableKey, 'Existing tag is inactive.')
		else skip('tag', tag.stableKey)
		const translation = tagTranslations.get(tag.stableKey)
		const occupied = tagSlugs.get(tag.stableKey)
		if (!translation) {
			if (occupied && occupied.tag_id !== current?.id) conflict('tag_translation', `en:${tag.stableKey}`, `Slug ${tag.stableKey} is already used.`)
			else create.tagTranslations.push(tag)
		} else if (translation.slug !== tag.stableKey || translation.name !== tag.name || translation.status !== 'published' || !translation.published_at) conflict('tag_translation', `en:${tag.stableKey}`, 'Existing English tag translation differs from the published baseline.')
		else skip('tag_translation', `en:${tag.stableKey}`)
	}

	for (const article of catalogue.articles) {
		const stored = storage.get(article.cover.objectPath)
		if (!stored) create.storageObjects.push(article)
		else if (stored.size !== article.cover.size) conflict('storage_object', article.cover.objectPath, `Stored size ${stored.size} differs from ${article.cover.size}.`)
		else skip('storage_object', article.cover.objectPath)
		const mediaKey = `public-media:${article.cover.objectPath}`
		const mediaRow = media.get(mediaKey)
		if (!mediaRow) create.mediaAssets.push(article)
		else if (mediaRow.checksum !== article.cover.checksum || Number(mediaRow.file_size_bytes) !== article.cover.size || mediaRow.mime_type !== article.cover.mimeType || mediaRow.width !== article.cover.width || mediaRow.height !== article.cover.height || !mediaRow.is_public) conflict('media_asset', article.cover.objectPath, 'Existing managed media metadata differs from the checked-in cover.')
		else skip('media_asset', article.cover.objectPath)
		const mediaTranslation = mediaTranslations.get(article.cover.objectPath)
		if (!mediaTranslation) create.mediaTranslations.push(article)
		else if (mediaTranslation.alt_text !== article.cover.alt) conflict('media_translation', `en:${article.cover.objectPath}`, 'Existing English alt text differs.')
		else skip('media_translation', `en:${article.cover.objectPath}`)

		const current = articles.get(article.stableKey)
		if (!current) create.articles.push(article)
		else {
			const currentCover = mediaKeys.get(current.cover_media_id)?.object_path
			if (current.kind !== 'article' || currentCover !== article.cover.objectPath || current.external_media_url !== null) conflict('article', article.stableKey, 'Existing canonical article or cover differs.')
			else skip('article', article.stableKey)
		}
		const translation = articleTranslations.get(article.stableKey)
		const occupied = articleSlugs.get(article.slug)
		if (!translation) {
			if (occupied && occupied.article_id !== current?.id) conflict('article_translation', `en:${article.stableKey}`, `Slug ${article.slug} is already used.`)
			else create.articleTranslations.push(article)
		} else if (!sameArticleTranslation(translation, article)) conflict('article_translation', `en:${article.stableKey}`, 'Existing English article content or publication state differs.')
		else skip('article_translation', `en:${article.stableKey}`)

		for (const [displayOrder, authorKey] of article.authorKeys.entries()) {
			const relation = existing.articleAuthors.find((row) => articleKeys.get(row.article_id)?.stable_key === article.stableKey && peopleKeys.get(row.person_id)?.stable_key === authorKey)
			if (!relation) create.articleAuthors.push({ articleKey: article.stableKey, authorKey, displayOrder })
			else if (relation.display_order !== displayOrder) conflict('article_author', `${article.stableKey}:${authorKey}`, 'Existing author order differs.')
			else skip('article_author', `${article.stableKey}:${authorKey}`)
		}
		const tagRelation = existing.articleTags.find((row) => articleKeys.get(row.article_id)?.stable_key === article.stableKey && tagKeys.get(row.tag_id)?.stable_key === article.tag.stableKey)
		if (!tagRelation) create.articleTags.push({ articleKey: article.stableKey, tagKey: article.tag.stableKey })
		else skip('article_tag', `${article.stableKey}:${article.tag.stableKey}`)
	}

	return { create, skipped, conflicts, counts: { created: Object.values(create).reduce((sum, rows) => sum + rows.length, 0), skipped: skipped.length, conflicting: conflicts.length } }

	function skip(entity, key) { skipped.push({ entity, key }) }
	function conflict(entity, key, reason) { conflicts.push({ entity, key, reason }) }
}

function sameArticleTranslation(current, expected) {
	return current.slug === expected.slug && current.title === expected.title && current.excerpt === expected.excerpt && current.status === 'published' && new Date(current.published_at).toISOString() === expected.publishedAt && stableJson(current.content) === stableJson(expected.content) && stableJson(current.sources) === stableJson(expected.sources)
}

function stableJson(value) {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
	if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
	return JSON.stringify(value)
}

function legacyArticleDocument(article) {
	const content = []
	for (const section of article.paragraphs ?? []) {
		if (clean(section.title)) content.push(heading(clean(section.title)))
		for (const value of section.content ?? []) {
			if (typeof value === 'string') content.push(paragraph(value))
			else if (value?.type === 'unordered-list' || value?.type === 'ordered-list') content.push(list(value))
		}
	}
	if (article.conclusion?.content) {
		content.push(heading('Contact us'))
		for (const part of clean(article.conclusion.content).split(/\s*<br\s*\/?>\s*/i).filter(Boolean)) content.push(paragraph(part))
		if (article.conclusion.contact?.length) content.push({ type: 'bulletList', content: article.conclusion.contact.map((email) => ({ type: 'listItem', content: [paragraph(clean(email))] })) })
	}
	return { type: 'doc', content }
}

function heading(text) { return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] } }
function paragraph(text) { const content = inlineWithBold(clean(text)); return content.length ? { type: 'paragraph', content } : { type: 'paragraph' } }
function list(value) { return { type: value.type === 'ordered-list' ? 'orderedList' : 'bulletList', ...(value.type === 'ordered-list' ? { attrs: { start: 1 } } : {}), content: value.items.map((item) => ({ type: 'listItem', content: [paragraph(item)] })) } }
function inlineWithBold(text) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
	return parts.map((part) => part.startsWith('**') && part.endsWith('**') ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] } : { type: 'text', text: part })
}
function sourceFromUrl(value) { const url = new URL(value); return { label: url.hostname.replace(/^www\./, ''), url: url.toString() } }
function parseLegacyDate(value) {
	const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(clean(value))
	if (!match) throw new Error(`Unsupported legacy publication date: ${value}`)
	const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
	const month = months.indexOf(match[2].toLowerCase())
	if (month === -1) throw new Error(`Unsupported legacy publication month: ${match[2]}`)
	return new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString()
}
function slugify(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }
function clean(value) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '' }
function uniqueBy(values, key) { return [...new Map(values.map((value) => [key(value), value])).values()] }
function duplicates(values) { return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))] }
