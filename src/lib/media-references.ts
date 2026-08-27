import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type MediaReference = {
	type: 'Person' | 'Service' | 'Sector' | 'Article' | 'Country' | 'Country flag' | 'Country outline' | 'Partner' | 'Endorsement'
	label: string
	href: string | null
}

export async function mediaReferencesByAssetId(assetIds: string[]) {
	const references = new Map<string, MediaReference[]>()
	if (!assetIds.length) return references
	const supabase = await createClient()
	const [people, services, sectors, articles, countries, partners, endorsements] = await Promise.all([
		supabase.from('people').select('id, display_name, portrait_media_id').in('portrait_media_id', assetIds),
		supabase.from('services').select('id, stable_key, icon_media_id').in('icon_media_id', assetIds),
		supabase.from('sectors').select('id, stable_key, icon_media_id').in('icon_media_id', assetIds),
		supabase.from('articles').select('id, stable_key, cover_media_id').in('cover_media_id', assetIds),
		supabase.from('countries').select('code, flag_media_id, outline_media_id').or(`flag_media_id.in.(${assetIds.join(',')}),outline_media_id.in.(${assetIds.join(',')})`),
		supabase.from('partners').select('id, name, logo_media_id').in('logo_media_id', assetIds),
		supabase.from('endorsements').select('id, attribution_name, portrait_media_id').in('portrait_media_id', assetIds),
	])
	const error = [people, services, sectors, articles, countries, partners, endorsements].find((result) => result.error)?.error
	if (error) throw new Error(`Could not inspect media references: ${error.message}`)

	function add(assetId: string | null, reference: MediaReference) {
		if (!assetId) return
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

	return references
}
