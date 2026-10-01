// Version 4 of the visual-test seed: placeholder newsroom articles, so the
// listing grid, filters, pagination and detail template can be reviewed with
// more than the two legacy articles. English only, lorem-ipsum copy, and every
// stable key and slug starts with `placeholder-`. Covers reuse the managed
// legacy newsroom images; nothing is uploaded. Create-only: an existing
// placeholder that differs is a conflict and blocks apply.

const PREFIX = 'placeholder-'

export function loadPlaceholderArticles(config) {
	const content = config.placeholderArticleContent
	return (config.placeholderArticles ?? []).map((entry) => ({ ...entry, content }))
}

export function validatePlaceholderArticles(articles) {
	const issues = []
	const keys = new Set()
	for (const article of articles) {
		if (!article.stableKey.startsWith(PREFIX) || article.slug !== article.stableKey) issues.push(`${article.stableKey} must use a ${PREFIX}* key equal to its slug.`)
		if (keys.has(article.stableKey)) issues.push(`Duplicate placeholder article ${article.stableKey}.`)
		keys.add(article.stableKey)
		if (!/^[a-z][a-z0-9-]*$/.test(article.kind)) issues.push(`${article.stableKey} has an invalid kind.`)
		if (!(new Date(article.publishedAt) < new Date())) issues.push(`${article.stableKey} must be published in the past.`)
		if (!article.title || !article.excerpt) issues.push(`${article.stableKey} needs a title and excerpt.`)
		if (article.content?.attrs?.schemaVersion !== 2 || !article.content?.content?.length) issues.push(`${article.stableKey} needs a version-2 body.`)
	}
	for (const article of articles) for (const related of article.related) if (!keys.has(related) || related === article.stableKey) issues.push(`${article.stableKey} relates to unknown ${related}.`)
	if (articles.filter((article) => article.isFeatured).length > 1) issues.push('At most one placeholder article may be featured.')
	return { issues }
}

export function emptyPlaceholderArticleState() {
	return { articles: [], articleTranslations: [], articleAuthors: [], articleTags: [], articleServices: [], articleSectors: [], articleRelations: [], people: [], tags: [], services: [], sectors: [], mediaAssets: [] }
}

export function createPlaceholderArticlePlan(articles, existing) {
	const create = { articles: [], articleTranslations: [], articleAuthors: [], articleTags: [], articleServices: [], articleSectors: [], articleRelations: [] }
	const skipped = []
	const conflicts = []
	const byKey = (rows) => new Map(rows.map((row) => [row.stable_key, row]))
	const canonical = byKey(existing.articles)
	const articleKeyById = new Map(existing.articles.map((row) => [row.id, row.stable_key]))
	const mediaByPath = new Map(existing.mediaAssets.map((row) => [row.object_path, row]))
	const mediaPathById = new Map(existing.mediaAssets.map((row) => [row.id, row.object_path]))
	const people = byKey(existing.people)
	const tags = byKey(existing.tags)
	const services = byKey(existing.services)
	const sectors = byKey(existing.sectors)
	const englishTranslations = existing.articleTranslations.filter((row) => row.locale === 'en')
	const translationByArticle = new Map(englishTranslations.map((row) => [articleKeyById.get(row.article_id), row]))
	const slugOwner = new Map(englishTranslations.map((row) => [row.slug, articleKeyById.get(row.article_id)]))

	for (const article of articles) {
		if (article.cover && !mediaByPath.has(article.cover)) conflict('article', article.stableKey, `Cover ${article.cover} is not a managed media asset.`)
		for (const [kind, keys, lookup] of [['author', article.authors, people], ['tag', article.tags, tags], ['service', article.services, services], ['sector', article.sectors, sectors]]) {
			for (const key of keys) if (!lookup.has(key)) conflict('article', article.stableKey, `Unknown ${kind} ${key}.`)
		}

		const current = canonical.get(article.stableKey)
		if (!current) create.articles.push(article)
		else if (current.kind !== article.kind || (mediaPathById.get(current.cover_media_id) ?? null) !== article.cover || current.is_featured !== article.isFeatured || current.featured_order !== article.featuredOrder || current.external_media_url !== null) conflict('article', article.stableKey, 'Existing canonical placeholder differs.')
		else skip('article', article.stableKey)

		const translation = translationByArticle.get(article.stableKey)
		if (!translation) {
			const owner = slugOwner.get(article.slug)
			if (owner && owner !== article.stableKey) conflict('article_translation', `en:${article.stableKey}`, `Slug ${article.slug} is used by ${owner}.`)
			else create.articleTranslations.push(article)
		} else if (!sameTranslation(translation, article)) conflict('article_translation', `en:${article.stableKey}`, 'Existing English placeholder differs and will not be overwritten.')
		else skip('article_translation', `en:${article.stableKey}`)

		const articleId = current?.id
		const has = (rows, column, id) => Boolean(articleId && id && rows.some((row) => row.article_id === articleId && row[column] === id))
		article.authors.forEach((person, displayOrder) => relation('articleAuthors', { article: article.stableKey, person, displayOrder }, has(existing.articleAuthors, 'person_id', people.get(person)?.id)))
		for (const tag of article.tags) relation('articleTags', { article: article.stableKey, tag }, has(existing.articleTags, 'tag_id', tags.get(tag)?.id))
		for (const service of article.services) relation('articleServices', { article: article.stableKey, service }, has(existing.articleServices, 'service_id', services.get(service)?.id))
		for (const sector of article.sectors) relation('articleSectors', { article: article.stableKey, sector }, has(existing.articleSectors, 'sector_id', sectors.get(sector)?.id))
		article.related.forEach((related, displayOrder) => relation('articleRelations', { article: article.stableKey, related, displayOrder }, Boolean(articleId && existing.articleRelations.some((row) => row.source_article_id === articleId && articleKeyById.get(row.related_article_id) === related))))
	}

	const count = (collections) => Object.values(collections).reduce((sum, rows) => sum + rows.length, 0)
	return { create, update: {}, skipped, conflicts, counts: { created: count(create), updated: 0, skipped: skipped.length, conflicting: conflicts.length } }

	function relation(collection, value, exists) { if (exists) skip(collection, Object.values(value).join(':')); else create[collection].push(value) }
	function skip(entity, key) { skipped.push({ entity, key }) }
	function conflict(entity, key, reason) { conflicts.push({ entity, key, reason }) }
}

function sameTranslation(row, expected) {
	return row.slug === expected.slug && row.title === expected.title && row.excerpt === expected.excerpt && row.status === 'published'
		&& new Date(row.published_at).toISOString() === expected.publishedAt && stableJson(row.content) === stableJson(expected.content) && stableJson(row.sources) === stableJson(expected.sources)
}

function stableJson(value) {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
	if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
	return JSON.stringify(value)
}
