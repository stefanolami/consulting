import 'server-only'

import { articleImageMediaIds } from '@/lib/article-document'
import { createClient } from '@/lib/supabase/server'

export type MediaReference = {
	type: 'Person' | 'Service' | 'Sector' | 'Article' | 'Article inline image' | 'Country' | 'Country flag' | 'Country outline' | 'Partner' | 'Endorsement'
	label: string
	href: string | null
}

/**
 * Every current CMS use of media assets, by asset id (audit MED-08: the scan
 * does not grow with the library). Each table is read once for its rows that
 * have a media id, instead of filtering by a list of every asset id, which
 * outgrows a PostgREST URL; article translations are read only when their
 * body contains an inline image. `assetIds` limits the result, not the
 * queries. The database repeats the in-use check when an asset is deleted
 * (delete_media_asset).
 */
export async function mediaReferencesByAssetId(assetIds?: readonly string[]) {
	const references = new Map<string, MediaReference[]>()
	const wanted = assetIds ? new Set(assetIds) : null
	if (wanted && !wanted.size) return references
	const supabase = await createClient()
	const [people, services, sectors, articles, countries, partners, endorsements, articleTranslations] = await Promise.all([
		supabase.from('people').select('id, display_name, portrait_media_id').not('portrait_media_id', 'is', null),
		supabase.from('services').select('id, stable_key, icon_media_id').not('icon_media_id', 'is', null),
		supabase.from('sectors').select('id, stable_key, icon_media_id').not('icon_media_id', 'is', null),
		supabase.from('articles').select('id, stable_key, cover_media_id').not('cover_media_id', 'is', null),
		supabase.from('countries').select('code, flag_media_id, outline_media_id').or('flag_media_id.not.is.null,outline_media_id.not.is.null'),
		supabase.from('partners').select('id, name, logo_media_id').not('logo_media_id', 'is', null),
		supabase.from('endorsements').select('id, attribution_name, portrait_media_id').not('portrait_media_id', 'is', null),
		supabase.from('article_translations').select('article_id, locale, title, content').contains('content', { content: [{ type: 'articleImage' }] }),
	])
	const error = [people, services, sectors, articles, countries, partners, endorsements, articleTranslations].find((result) => result.error)?.error
	if (error) throw new Error(`Could not inspect media references: ${error.message}`)

	function add(assetId: string | null, reference: MediaReference) {
		if (!assetId || (wanted && !wanted.has(assetId))) return
		references.set(assetId, [...(references.get(assetId) ?? []), reference])
	}

	for (const person of people.data ?? []) add(person.portrait_media_id, { type: 'Person', label: person.display_name, href: `/admin/people/${person.id}` })
	for (const service of services.data ?? []) add(service.icon_media_id, { type: 'Service', label: service.stable_key, href: `/admin/catalogue/services/${service.id}` })
	for (const sector of sectors.data ?? []) add(sector.icon_media_id, { type: 'Sector', label: sector.stable_key, href: `/admin/catalogue/sectors/${sector.id}` })
	for (const article of articles.data ?? []) add(article.cover_media_id, { type: 'Article', label: article.stable_key, href: `/admin/newsroom/${article.id}` })
	for (const country of countries.data ?? []) {
		add(country.flag_media_id, { type: 'Country flag', label: country.code, href: `/admin/outreach/${country.code}` })
		add(country.outline_media_id, { type: 'Country outline', label: country.code, href: `/admin/outreach/${country.code}` })
	}
	for (const partner of partners.data ?? []) add(partner.logo_media_id, { type: 'Partner', label: partner.name, href: `/admin/partners/partners/${partner.id}` })
	for (const endorsement of endorsements.data ?? []) add(endorsement.portrait_media_id, { type: 'Endorsement', label: endorsement.attribution_name, href: `/admin/partners/endorsements/${endorsement.id}` })
	for (const translation of articleTranslations.data ?? []) {
		let inlineIds: string[]
		try { inlineIds = articleImageMediaIds(translation.content) } catch { continue }
		for (const mediaId of inlineIds) add(mediaId, { type: 'Article inline image', label: `${translation.title} (${translation.locale})`, href: `/admin/newsroom/${translation.article_id}` })
	}

	return references
}
