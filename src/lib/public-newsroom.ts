import { unstable_cache } from 'next/cache'
import { z } from 'zod'

import { type AppLocale, routing } from '@/i18n/routing'
import { PUBLIC_NEWSROOM_CACHE_TAG } from '@/lib/cache-tags'
import { createPublicClient } from '@/lib/supabase/public'
import type { Json } from '@/types/database.generated'

const CACHE_REVALIDATE_SECONDS = 60 * 60

export const NEWSROOM_PAGE_SIZE = 12

export type NewsroomFilters = {
	author?: string
	sector?: string
	service?: string
	tag?: string
}

export type NewsroomFilterOption = { label: string; slug: string }
export type PublicMedia = { alt: string; caption: string | null; url: string }
export type NewsroomAuthor = { id: string; name: string; profileSlug: string | null }
export type NewsroomArticleCard = {
	authors: NewsroomAuthor[]
	cover: PublicMedia | null
	excerpt: string | null
	id: string
	publishedAt: string
	slug: string
	tags: NewsroomFilterOption[]
	title: string
}
export type NewsroomListing = {
	articles: NewsroomArticleCard[]
	filters: { authors: NewsroomFilterOption[]; sectors: NewsroomFilterOption[]; services: NewsroomFilterOption[]; tags: NewsroomFilterOption[] }
	page: number
	pageCount: number
	total: number
}
export type NewsroomDetail = NewsroomArticleCard & {
	alternates: Array<{ locale: AppLocale; slug: string }>
	content: Json
	externalMediaUrl: string | null
	relatedArticles: NewsroomArticleCard[]
	sectors: NewsroomFilterOption[]
	seoDescription: string | null
	seoTitle: string | null
	services: NewsroomFilterOption[]
	sources: Array<{ label: string; url: string }>
}

type ArticleTranslation = { articleId: string; content: Json; excerpt: string | null; publishedAt: string; seoDescription: string | null; seoTitle: string | null; slug: string; sources: Json; title: string }
type ArticleCanonical = { coverMediaId: string | null; externalMediaUrl: string | null; id: string }

function publicationTime() { return new Date().toISOString() }

function cleanFilters(filters: NewsroomFilters): NewsroomFilters {
	return Object.fromEntries(Object.entries(filters).filter(([, value]) => typeof value === 'string' && value.length > 0)) as NewsroomFilters
}

function parseSources(value: Json): Array<{ label: string; url: string }> {
	const result = z.array(z.object({ label: z.string().min(1).max(300), url: z.string().url().max(2_048) }).strict()).safeParse(value)
	return result.success ? result.data : []
}

async function publishedArticleTranslations(locale: AppLocale, slug?: string): Promise<ArticleTranslation[]> {
	const supabase = createPublicClient()
	let query = supabase.from('article_translations').select('article_id, slug, title, excerpt, content, sources, seo_title, seo_description, published_at')
		.eq('locale', locale).eq('status', 'published').lte('published_at', publicationTime()).order('published_at', { ascending: false })
	if (slug) query = query.eq('slug', slug)
	const { data, error } = await query
	if (error) throw new Error(`Unable to load published newsroom content: ${error.message}`)
	return (data ?? []).map((row) => ({ articleId: row.article_id, content: row.content, excerpt: row.excerpt, publishedAt: row.published_at!, seoDescription: row.seo_description, seoTitle: row.seo_title, slug: row.slug, sources: row.sources, title: row.title }))
}

async function publishedCanonicalArticles(articleIds: string[]): Promise<ArticleCanonical[]> {
	if (!articleIds.length) return []
	const { data, error } = await createPublicClient().from('articles').select('id, cover_media_id, external_media_url').in('id', articleIds)
	if (error) throw new Error(`Unable to load newsroom records: ${error.message}`)
	return (data ?? []).map((row) => ({ coverMediaId: row.cover_media_id, externalMediaUrl: row.external_media_url, id: row.id }))
}

async function localizedMedia(mediaIds: string[], locale: AppLocale): Promise<Map<string, PublicMedia>> {
	if (!mediaIds.length) return new Map()
	const supabase = createPublicClient()
	const [{ data: assets, error: assetsError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('media_assets').select('id, bucket_id, object_path').in('id', mediaIds).eq('is_public', true),
		supabase.from('media_asset_translations').select('media_asset_id, alt_text, caption').in('media_asset_id', mediaIds).eq('locale', locale),
	])
	if (assetsError || translationsError) throw new Error(`Unable to load localized newsroom media: ${assetsError?.message ?? translationsError?.message}`)
	const metadata = new Map((translations ?? []).filter((item) => item.alt_text.trim()).map((item) => [item.media_asset_id, item]))
	return new Map((assets ?? []).flatMap((asset) => {
		const item = metadata.get(asset.id)
		if (!item) return []
		return [[asset.id, { alt: item.alt_text, caption: item.caption, url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl }]]
	}))
}

async function relationArticleIds(articleIds: string[], filter: NewsroomFilters, locale: AppLocale): Promise<string[]> {
	if (!articleIds.length) return []
	const supabase = createPublicClient()
	let ids = new Set(articleIds)
	async function restrict(targetIds: string[], relation: PromiseLike<{ data: Array<{ article_id: string }> | null; error: { message: string } | null }>) {
		if (!targetIds.length || !ids.size) { ids = new Set(); return }
		const { data, error } = await relation
		if (error) throw new Error(`Unable to filter newsroom articles: ${error.message}`)
		ids = new Set((data ?? []).map((item) => item.article_id))
	}
	if (filter.tag) {
		const [{ data: translations, error: translationError }, { data: tags, error: tagsError }] = await Promise.all([supabase.from('tag_translations').select('tag_id').eq('locale', locale).eq('slug', filter.tag).eq('status', 'published').lte('published_at', publicationTime()), supabase.from('tags').select('id').eq('is_active', true)])
		if (translationError || tagsError) throw new Error(`Unable to load newsroom tag filters: ${translationError?.message ?? tagsError?.message}`)
		const active = new Set((tags ?? []).map((item) => item.id)); const targetIds = (translations ?? []).map((item) => item.tag_id).filter((id) => active.has(id))
		await restrict(targetIds, supabase.from('article_tags').select('article_id').in('article_id', [...ids]).in('tag_id', targetIds))
	}
	if (filter.service) {
		const [{ data: translations, error: translationError }, { data: services, error: servicesError }] = await Promise.all([supabase.from('service_translations').select('service_id').eq('locale', locale).eq('slug', filter.service).eq('status', 'published').lte('published_at', publicationTime()), supabase.from('services').select('id').eq('is_active', true)])
		if (translationError || servicesError) throw new Error(`Unable to load newsroom service filters: ${translationError?.message ?? servicesError?.message}`)
		const active = new Set((services ?? []).map((item) => item.id)); const targetIds = (translations ?? []).map((item) => item.service_id).filter((id) => active.has(id))
		await restrict(targetIds, supabase.from('article_services').select('article_id').in('article_id', [...ids]).in('service_id', targetIds))
	}
	if (filter.sector) {
		const [{ data: translations, error: translationError }, { data: sectors, error: sectorsError }] = await Promise.all([supabase.from('sector_translations').select('sector_id').eq('locale', locale).eq('slug', filter.sector).eq('status', 'published').lte('published_at', publicationTime()), supabase.from('sectors').select('id').eq('is_active', true)])
		if (translationError || sectorsError) throw new Error(`Unable to load newsroom sector filters: ${translationError?.message ?? sectorsError?.message}`)
		const active = new Set((sectors ?? []).map((item) => item.id)); const targetIds = (translations ?? []).map((item) => item.sector_id).filter((id) => active.has(id))
		await restrict(targetIds, supabase.from('article_sectors').select('article_id').in('article_id', [...ids]).in('sector_id', targetIds))
	}
	if (filter.author) {
		const [{ data: translations, error: translationError }, { data: people, error: peopleError }] = await Promise.all([supabase.from('people_translations').select('person_id').eq('locale', locale).eq('slug', filter.author).eq('status', 'published').lte('published_at', publicationTime()), supabase.from('people').select('id').eq('is_active', true).eq('is_author', true)])
		if (translationError || peopleError) throw new Error(`Unable to load newsroom author filters: ${translationError?.message ?? peopleError?.message}`)
		const active = new Set((people ?? []).map((item) => item.id)); const targetIds = (translations ?? []).map((item) => item.person_id).filter((id) => active.has(id))
		await restrict(targetIds, supabase.from('article_authors').select('article_id').in('article_id', [...ids]).in('person_id', targetIds))
	}
	return articleIds.filter((id) => ids.has(id))
}

async function loadArticleAuthors(articleIds: string[], locale: AppLocale): Promise<Map<string, NewsroomAuthor[]>> {
	if (!articleIds.length) return new Map()
	const supabase = createPublicClient(); const now = publicationTime()
	const { data: relations, error } = await supabase.from('article_authors').select('article_id, person_id, display_order').in('article_id', articleIds).order('display_order')
	if (error) throw new Error(`Unable to load article authors: ${error.message}`)
	const personIds = [...new Set((relations ?? []).map((item) => item.person_id))]
	if (!personIds.length) return new Map()
	const [{ data: people, error: peopleError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('people').select('id, display_name, is_author, is_active, is_team_member').in('id', personIds).eq('is_active', true).eq('is_author', true),
		supabase.from('people_translations').select('person_id, slug, card_name').in('person_id', personIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
	])
	if (peopleError || translationsError) throw new Error(`Unable to load localized article authors: ${peopleError?.message ?? translationsError?.message}`)
	const peopleById = new Map((people ?? []).map((person) => [person.id, person])); const translationById = new Map((translations ?? []).map((item) => [item.person_id, item])); const result = new Map<string, NewsroomAuthor[]>()
	for (const relation of relations ?? []) { const person = peopleById.get(relation.person_id); const translation = translationById.get(relation.person_id); if (!person || !translation) continue; result.set(relation.article_id, [...(result.get(relation.article_id) ?? []), { id: person.id, name: translation.card_name || person.display_name, profileSlug: person.is_team_member ? translation.slug : null }]) }
	return result
}

async function loadTaxonomy(articleIds: string[], locale: AppLocale, kind: 'tag' | 'service' | 'sector'): Promise<Map<string, NewsroomFilterOption[]>> {
	if (!articleIds.length) return new Map()
	const supabase = createPublicClient(); const now = publicationTime()
	if (kind === 'tag') {
		const { data: relations, error } = await supabase.from('article_tags').select('article_id, tag_id').in('article_id', articleIds); if (error) throw new Error(`Unable to load article tags: ${error.message}`)
		const ids = [...new Set((relations ?? []).map((item) => item.tag_id))]; const [{ data: tags, error: tagsError }, { data: translations, error: translationError }] = await Promise.all([supabase.from('tags').select('id, display_order').in('id', ids).eq('is_active', true).order('display_order'), supabase.from('tag_translations').select('tag_id, slug, name').in('tag_id', ids).eq('locale', locale).eq('status', 'published').lte('published_at', now)])
		if (tagsError || translationError) throw new Error(`Unable to load localized article tags: ${tagsError?.message ?? translationError?.message}`)
		return mapTaxonomy(relations ?? [], new Set((tags ?? []).map((item) => item.id)), new Map((translations ?? []).map((item) => [item.tag_id, { label: item.name, slug: item.slug }])), 'tag_id')
	}
	if (kind === 'service') {
		const { data: relations, error } = await supabase.from('article_services').select('article_id, service_id').in('article_id', articleIds); if (error) throw new Error(`Unable to load article services: ${error.message}`)
		const ids = [...new Set((relations ?? []).map((item) => item.service_id))]; const [{ data: services, error: servicesError }, { data: translations, error: translationError }] = await Promise.all([supabase.from('services').select('id, display_order').in('id', ids).eq('is_active', true).order('display_order'), supabase.from('service_translations').select('service_id, slug, name').in('service_id', ids).eq('locale', locale).eq('status', 'published').lte('published_at', now)])
		if (servicesError || translationError) throw new Error(`Unable to load localized article services: ${servicesError?.message ?? translationError?.message}`)
		return mapTaxonomy(relations ?? [], new Set((services ?? []).map((item) => item.id)), new Map((translations ?? []).map((item) => [item.service_id, { label: item.name, slug: item.slug }])), 'service_id')
	}
	const { data: relations, error } = await supabase.from('article_sectors').select('article_id, sector_id').in('article_id', articleIds); if (error) throw new Error(`Unable to load article sectors: ${error.message}`)
	const ids = [...new Set((relations ?? []).map((item) => item.sector_id))]; const [{ data: sectors, error: sectorsError }, { data: translations, error: translationError }] = await Promise.all([supabase.from('sectors').select('id, display_order').in('id', ids).eq('is_active', true).order('display_order'), supabase.from('sector_translations').select('sector_id, slug, name').in('sector_id', ids).eq('locale', locale).eq('status', 'published').lte('published_at', now)])
	if (sectorsError || translationError) throw new Error(`Unable to load localized article sectors: ${sectorsError?.message ?? translationError?.message}`)
	return mapTaxonomy(relations ?? [], new Set((sectors ?? []).map((item) => item.id)), new Map((translations ?? []).map((item) => [item.sector_id, { label: item.name, slug: item.slug }])), 'sector_id')
}

function mapTaxonomy<T extends { article_id: string }>(relations: T[], activeIds: Set<string>, localized: Map<string, NewsroomFilterOption>, key: keyof T): Map<string, NewsroomFilterOption[]> {
	const result = new Map<string, NewsroomFilterOption[]>()
	for (const relation of relations) { const id = relation[key]; if (typeof id !== 'string') continue; const item = localized.get(id); if (!activeIds.has(id) || !item) continue; result.set(relation.article_id, [...(result.get(relation.article_id) ?? []), item]) }
	return result
}

async function articleCards(translations: ArticleTranslation[], locale: AppLocale): Promise<{ cards: NewsroomArticleCard[]; canonicals: Map<string, ArticleCanonical> }> {
	const articleIds = translations.map((item) => item.articleId); const canonicalRows = await publishedCanonicalArticles(articleIds); const canonicals = new Map(canonicalRows.map((item) => [item.id, item])); const ids = translations.map((item) => item.articleId).filter((id) => canonicals.has(id))
	const [media, authors, tags] = await Promise.all([
		localizedMedia(canonicalRows.flatMap((item) => item.coverMediaId ? [item.coverMediaId] : []), locale), loadArticleAuthors(ids, locale), loadTaxonomy(ids, locale, 'tag'),
	])
	return { canonicals, cards: translations.flatMap((translation) => { const canonical = canonicals.get(translation.articleId); if (!canonical) return []; return [{ authors: authors.get(translation.articleId) ?? [], cover: canonical.coverMediaId ? media.get(canonical.coverMediaId) ?? null : null, excerpt: translation.excerpt, id: translation.articleId, publishedAt: translation.publishedAt, slug: translation.slug, tags: tags.get(translation.articleId) ?? [], title: translation.title }] }) }
}

async function filterOptions(locale: AppLocale): Promise<NewsroomListing['filters']> {
	const supabase = createPublicClient(); const now = publicationTime()
	const [tagsResult, servicesResult, sectorsResult, authorsResult] = await Promise.all([
		Promise.all([supabase.from('tags').select('id').eq('is_active', true), supabase.from('tag_translations').select('tag_id, slug, name').eq('locale', locale).eq('status', 'published').lte('published_at', now)]),
		Promise.all([supabase.from('services').select('id').eq('is_active', true), supabase.from('service_translations').select('service_id, slug, name').eq('locale', locale).eq('status', 'published').lte('published_at', now)]),
		Promise.all([supabase.from('sectors').select('id').eq('is_active', true), supabase.from('sector_translations').select('sector_id, slug, name').eq('locale', locale).eq('status', 'published').lte('published_at', now)]),
		Promise.all([supabase.from('people').select('id, is_author').eq('is_active', true).eq('is_author', true), supabase.from('people_translations').select('person_id, slug, card_name').eq('locale', locale).eq('status', 'published').lte('published_at', now)]),
	])
	const results = [...tagsResult, ...servicesResult, ...sectorsResult, ...authorsResult]; const failed = results.find((result) => result.error); if (failed?.error) throw new Error(`Unable to load newsroom filter options: ${failed.error.message}`)
	const options = (activeIds: Set<string>, entries: Array<{ id: string; label: string; slug: string }>) => entries.filter((item) => activeIds.has(item.id)).map(({ label, slug }) => ({ label, slug })).sort((a, b) => a.label.localeCompare(b.label, locale))
	const tags = options(new Set((tagsResult[0].data ?? []).map((item) => item.id)), (tagsResult[1].data ?? []).map((item) => ({ id: item.tag_id, label: item.name, slug: item.slug })))
	const services = options(new Set((servicesResult[0].data ?? []).map((item) => item.id)), (servicesResult[1].data ?? []).map((item) => ({ id: item.service_id, label: item.name, slug: item.slug })))
	const sectors = options(new Set((sectorsResult[0].data ?? []).map((item) => item.id)), (sectorsResult[1].data ?? []).map((item) => ({ id: item.sector_id, label: item.name, slug: item.slug })))
	const authors = options(new Set((authorsResult[0].data ?? []).map((item) => item.id)), (authorsResult[1].data ?? []).map((item) => ({ id: item.person_id, label: item.card_name || item.slug, slug: item.slug })))
	return { authors, sectors, services, tags }
}

async function loadNewsroomListing(locale: AppLocale, page: number, rawFilters: NewsroomFilters): Promise<NewsroomListing> {
	const filters = cleanFilters(rawFilters); const translations = await publishedArticleTranslations(locale); const matchingIds = await relationArticleIds(translations.map((item) => item.articleId), filters, locale); const matchingTranslations = translations.filter((item) => matchingIds.includes(item.articleId)); const total = matchingTranslations.length; const pageCount = Math.max(1, Math.ceil(total / NEWSROOM_PAGE_SIZE)); const currentPage = Math.min(Math.max(1, page), pageCount); const slice = matchingTranslations.slice((currentPage - 1) * NEWSROOM_PAGE_SIZE, currentPage * NEWSROOM_PAGE_SIZE)
	const [{ cards }, filtersOptions] = await Promise.all([articleCards(slice, locale), filterOptions(locale)])
	return { articles: cards, filters: filtersOptions, page: currentPage, pageCount, total }
}

async function loadRelatedArticles(articleId: string, locale: AppLocale): Promise<NewsroomArticleCard[]> {
	const supabase = createPublicClient(); const { data: relations, error } = await supabase.from('article_relations').select('related_article_id, display_order').eq('source_article_id', articleId).order('display_order')
	if (error) throw new Error(`Unable to load related articles: ${error.message}`)
	const ids = (relations ?? []).map((item) => item.related_article_id); if (!ids.length) return []
	const translations = (await publishedArticleTranslations(locale)).filter((item) => ids.includes(item.articleId)); const { cards } = await articleCards(translations, locale); const cardsById = new Map(cards.map((item) => [item.id, item])); return ids.flatMap((id) => { const card = cardsById.get(id); return card ? [card] : [] })
}

async function loadNewsroomDetail(locale: AppLocale, slug: string): Promise<NewsroomDetail | null> {
	const translation = (await publishedArticleTranslations(locale, slug))[0]; if (!translation) return null
	const [{ cards, canonicals }, services, sectors, relatedArticleCards, alternatesResult] = await Promise.all([
		articleCards([translation], locale), loadTaxonomy([translation.articleId], locale, 'service'), loadTaxonomy([translation.articleId], locale, 'sector'), loadRelatedArticles(translation.articleId, locale), createPublicClient().from('article_translations').select('locale, slug').eq('article_id', translation.articleId).eq('status', 'published').lte('published_at', publicationTime()),
	])
	if (alternatesResult.error) throw new Error(`Unable to load newsroom language alternates: ${alternatesResult.error.message}`)
	const card = cards[0]; const canonical = canonicals.get(translation.articleId); if (!card || !canonical) return null
	return { ...card, alternates: (alternatesResult.data ?? []).filter((item) => routing.locales.includes(item.locale as AppLocale)).map((item) => ({ locale: item.locale as AppLocale, slug: item.slug })), content: translation.content, externalMediaUrl: canonical.externalMediaUrl, relatedArticles: relatedArticleCards, sectors: sectors.get(translation.articleId) ?? [], seoDescription: translation.seoDescription, seoTitle: translation.seoTitle, services: services.get(translation.articleId) ?? [], sources: parseSources(translation.sources) }
}

export const getPublishedNewsroomListing = unstable_cache(loadNewsroomListing, ['published-newsroom-listing'], { revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_NEWSROOM_CACHE_TAG] })
export const getPublishedNewsroomDetail = unstable_cache(loadNewsroomDetail, ['published-newsroom-detail'], { revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_NEWSROOM_CACHE_TAG] })
