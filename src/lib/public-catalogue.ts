import { unstable_cache } from 'next/cache'

import { PUBLIC_CATALOGUE_CACHE_TAG } from '@/lib/cache-tags'
import type { AppLocale } from '@/i18n/routing'
import { createPublicClient } from '@/lib/supabase/public'
import type { Json } from '@/types/database.generated'

export type PublicCatalogueKind = 'service' | 'sector'

export type CatalogueCard = {
	id: string
	icon: PublicMedia | null
	name: string
	slug: string
	summary: string | null
}

export type CatalogueContact = {
	cardName: string
	email: string | null
	id: string
	phone: string | null
	portrait: PublicMedia | null
	role: string | null
	slug: string
}

export type RelatedArticle = {
	excerpt: string | null
	publishedAt: string
	slug: string
	title: string
}

export type CatalogueDetail = CatalogueCard & {
	alternates: Array<{ locale: AppLocale; slug: string }>
	contacts: CatalogueContact[]
	content: Json
	relatedArticles: RelatedArticle[]
	seoDescription: string | null
	seoTitle: string | null
}

type PublicMedia = {
	alt: string
	url: string
}

type LocalizedTranslation = {
	content: Json
	entityId: string
	name: string
	publishedAt: string
	seoDescription: string | null
	seoTitle: string | null
	slug: string
	summary: string | null
}

const CACHE_REVALIDATE_SECONDS = 60 * 60

function tableNames(kind: PublicCatalogueKind) {
	return kind === 'service'
		? {
			canonical: 'services' as const,
			entityKey: 'service_id' as const,
			people: 'service_people' as const,
			articleRelations: 'article_services' as const,
			translation: 'service_translations' as const,
		}
		: {
			canonical: 'sectors' as const,
			entityKey: 'sector_id' as const,
			people: 'sector_people' as const,
			articleRelations: 'article_sectors' as const,
			translation: 'sector_translations' as const,
		}
}

function publicationTime() {
	return new Date().toISOString()
}

async function publishedTranslations(
	kind: PublicCatalogueKind,
	locale: AppLocale,
	slug?: string,
): Promise<LocalizedTranslation[]> {
	const supabase = createPublicClient()
	const now = publicationTime()

	if (kind === 'service') {
		let query = supabase
			.from('service_translations')
			.select('service_id, slug, name, summary, content, seo_title, seo_description, published_at')
			.eq('locale', locale)
			.eq('status', 'published')
			.lte('published_at', now)
		if (slug) query = query.eq('slug', slug)
		const { data, error } = await query
		if (error) throw new Error(`Unable to load published services: ${error.message}`)
		return (data ?? []).map((row) => ({
			content: row.content,
			entityId: row.service_id,
			name: row.name,
			publishedAt: row.published_at!,
			seoDescription: row.seo_description,
			seoTitle: row.seo_title,
			slug: row.slug,
			summary: row.summary,
		}))
	}

	let query = supabase
		.from('sector_translations')
		.select('sector_id, slug, name, summary, content, seo_title, seo_description, published_at')
		.eq('locale', locale)
		.eq('status', 'published')
		.lte('published_at', now)
	if (slug) query = query.eq('slug', slug)
	const { data, error } = await query
	if (error) throw new Error(`Unable to load published sectors: ${error.message}`)
	return (data ?? []).map((row) => ({
		content: row.content,
		entityId: row.sector_id,
		name: row.name,
		publishedAt: row.published_at!,
		seoDescription: row.seo_description,
		seoTitle: row.seo_title,
		slug: row.slug,
		summary: row.summary,
	}))
}

async function localizedMedia(
	mediaIds: string[],
	locale: AppLocale,
): Promise<Map<string, PublicMedia>> {
	if (!mediaIds.length) return new Map()
	const supabase = createPublicClient()
	const [{ data: assets, error: assetsError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('media_assets').select('id, bucket_id, object_path').in('id', mediaIds),
		supabase.from('media_asset_translations').select('media_asset_id, alt_text').in('media_asset_id', mediaIds).eq('locale', locale),
	])
	if (assetsError || translationsError) {
		throw new Error(`Unable to load localized media: ${assetsError?.message ?? translationsError?.message}`)
	}
	const altById = new Map((translations ?? []).map((translation) => [translation.media_asset_id, translation.alt_text]))
	return new Map((assets ?? []).flatMap((asset) => {
		const alt = altById.get(asset.id)
		if (!alt) return []
		const url = supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl
		return [[asset.id, { alt, url }]]
	}))
}

async function loadCatalogueList(
	kind: PublicCatalogueKind,
	locale: AppLocale,
): Promise<CatalogueCard[]> {
	const translations = await publishedTranslations(kind, locale)
	if (!translations.length) return []
	const ids = translations.map((translation) => translation.entityId)
	const tables = tableNames(kind)
	const supabase = createPublicClient()
	const { data: canonicalRows, error } = await supabase
		.from(tables.canonical)
		.select('id, icon_media_id, display_order')
		.in('id', ids)
		.eq('is_active', true)
		.order('display_order')
		.order('stable_key')
	if (error) throw new Error(`Unable to load the published ${kind} catalogue: ${error.message}`)
	const media = await localizedMedia(
		(canonicalRows ?? []).flatMap((row) => row.icon_media_id ? [row.icon_media_id] : []),
		locale,
	)
	const translationById = new Map(translations.map((translation) => [translation.entityId, translation]))
	return (canonicalRows ?? []).flatMap((row) => {
		const translation = translationById.get(row.id)
		if (!translation) return []
		return [{
			id: row.id,
			icon: row.icon_media_id ? media.get(row.icon_media_id) ?? null : null,
			name: translation.name,
			slug: translation.slug,
			summary: translation.summary,
		}]
	})
}

async function loadContacts(
	kind: PublicCatalogueKind,
	entityId: string,
	locale: AppLocale,
): Promise<CatalogueContact[]> {
	const supabase = createPublicClient()
	const relationQuery = kind === 'service'
		? supabase.from('service_people').select('person_id, display_order').eq('service_id', entityId).eq('relationship', 'contact').order('display_order')
		: supabase.from('sector_people').select('person_id, display_order').eq('sector_id', entityId).eq('relationship', 'contact').order('display_order')
	const { data: relations, error: relationsError } = await relationQuery
	if (relationsError) throw new Error(`Unable to load ${kind} contacts: ${relationsError.message}`)
	const personIds = (relations ?? []).map((relation) => relation.person_id)
	if (!personIds.length) return []
	const now = publicationTime()
	const [{ data: people, error: peopleError }, { data: translations, error: translationsError }, { data: roles, error: rolesError }] = await Promise.all([
		supabase.from('people').select('id, display_name, email, phone, portrait_media_id').in('id', personIds).eq('is_active', true).eq('is_team_member', true),
		supabase.from('people_translations').select('person_id, slug, card_name').in('person_id', personIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('people_profile_roles').select('person_id, title, card_label').in('person_id', personIds).eq('locale', locale).eq('is_card_role', true),
	])
	if (peopleError || translationsError || rolesError) {
		throw new Error(`Unable to load localized ${kind} contacts: ${peopleError?.message ?? translationsError?.message ?? rolesError?.message}`)
	}
	const media = await localizedMedia(
		(people ?? []).flatMap((person) => person.portrait_media_id ? [person.portrait_media_id] : []),
		locale,
	)
	const peopleById = new Map((people ?? []).map((person) => [person.id, person]))
	const translationById = new Map((translations ?? []).map((translation) => [translation.person_id, translation]))
	const roleById = new Map((roles ?? []).map((role) => [role.person_id, role.card_label || role.title]))
	return personIds.flatMap((personId) => {
		const person = peopleById.get(personId)
		const translation = translationById.get(personId)
		if (!person || !translation) return []
		return [{
			cardName: translation.card_name || person.display_name,
			email: person.email,
			id: person.id,
			phone: person.phone,
			portrait: person.portrait_media_id ? media.get(person.portrait_media_id) ?? null : null,
			role: roleById.get(personId) ?? null,
			slug: translation.slug,
		}]
	})
}

async function loadRelatedArticles(
	kind: PublicCatalogueKind,
	entityId: string,
	locale: AppLocale,
): Promise<RelatedArticle[]> {
	const supabase = createPublicClient()
	const relationQuery = kind === 'service'
		? supabase.from('article_services').select('article_id').eq('service_id', entityId)
		: supabase.from('article_sectors').select('article_id').eq('sector_id', entityId)
	const { data: relations, error: relationsError } = await relationQuery
	if (relationsError) throw new Error(`Unable to load related ${kind} articles: ${relationsError.message}`)
	const articleIds = (relations ?? []).map((relation) => relation.article_id)
	if (!articleIds.length) return []
	const { data, error } = await supabase
		.from('article_translations')
		.select('slug, title, excerpt, published_at')
		.in('article_id', articleIds)
		.eq('locale', locale)
		.eq('status', 'published')
		.lte('published_at', publicationTime())
		.order('published_at', { ascending: false })
	if (error) throw new Error(`Unable to load localized related articles: ${error.message}`)
	return (data ?? []).map((article) => ({
		excerpt: article.excerpt,
		publishedAt: article.published_at!,
		slug: article.slug,
		title: article.title,
	}))
}

async function loadAlternates(
	kind: PublicCatalogueKind,
	entityId: string,
): Promise<Array<{ locale: AppLocale; slug: string }>> {
	const supabase = createPublicClient()
	const now = publicationTime()
	const { data, error } = kind === 'service'
		? await supabase.from('service_translations').select('locale, slug').eq('service_id', entityId).eq('status', 'published').lte('published_at', now)
		: await supabase.from('sector_translations').select('locale, slug').eq('sector_id', entityId).eq('status', 'published').lte('published_at', now)
	if (error) throw new Error(`Unable to load ${kind} language alternates: ${error.message}`)
	return (data ?? []).map((translation) => ({ locale: translation.locale as AppLocale, slug: translation.slug }))
}

async function loadCatalogueDetail(
	kind: PublicCatalogueKind,
	locale: AppLocale,
	slug: string,
): Promise<CatalogueDetail | null> {
	const translation = (await publishedTranslations(kind, locale, slug))[0]
	if (!translation) return null
	const tables = tableNames(kind)
	const supabase = createPublicClient()
	const { data: canonical, error } = await supabase
		.from(tables.canonical)
		.select('id, icon_media_id')
		.eq('id', translation.entityId)
		.eq('is_active', true)
		.maybeSingle()
	if (error) throw new Error(`Unable to load this ${kind}: ${error.message}`)
	if (!canonical) return null
	const [media, contacts, relatedArticles, alternates] = await Promise.all([
		canonical.icon_media_id ? localizedMedia([canonical.icon_media_id], locale) : Promise.resolve(new Map<string, PublicMedia>()),
		loadContacts(kind, canonical.id, locale),
		loadRelatedArticles(kind, canonical.id, locale),
		loadAlternates(kind, canonical.id),
	])
	return {
		alternates,
		contacts,
		content: translation.content,
		id: canonical.id,
		icon: canonical.icon_media_id ? media.get(canonical.icon_media_id) ?? null : null,
		name: translation.name,
		relatedArticles,
		seoDescription: translation.seoDescription,
		seoTitle: translation.seoTitle,
		slug: translation.slug,
		summary: translation.summary,
	}
}

export const getPublishedCatalogueList = unstable_cache(
	loadCatalogueList,
	['published-catalogue-list'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
)

export const getPublishedCatalogueDetail = unstable_cache(
	loadCatalogueDetail,
	['published-catalogue-detail'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
)
