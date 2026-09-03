import { unstable_cache } from 'next/cache'

import type { AppLocale } from '@/i18n/routing'
import { PUBLIC_GLOBAL_CACHE_TAG } from '@/lib/cache-tags'
import { createPublicClient } from '@/lib/supabase/public'
import type { Json } from '@/types/database.generated'

export type PublicGlobalContent = {
	contact: { address: string | null; email: string | null; footerNote: string | null; phone: string | null } | null
	endorsements: Array<{ attributionName: string; attributionTitle: string | null; id: string; partnerName: string | null; quote: string }>
	partners: Array<{ alt: string; id: string; logoUrl: string; name: string; websiteUrl: string | null }>
	socials: Array<{ platform: string; url: string }>
}

const CACHE_REVALIDATE_SECONDS = 60 * 60
const SOCIAL_PLATFORMS = new Set(['linkedin', 'instagram', 'facebook', 'youtube', 'x'])

function record(value: Json | undefined): Record<string, Json | undefined> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json | undefined> : {}
}

function text(value: Json | undefined) { return typeof value === 'string' && value.trim() ? value.trim() : null }

function safeWebUrl(value: string | null) {
	if (!value) return null
	try { return ['http:', 'https:'].includes(new URL(value).protocol) ? value : null } catch { return null }
}

async function loadPublishedGlobalContent(locale: AppLocale): Promise<PublicGlobalContent> {
	const supabase = createPublicClient()
	const now = new Date().toISOString()
	const [{ data: partners, error: partnersError }, { data: partnerTranslations, error: partnerTranslationsError }, { data: endorsements, error: endorsementsError }, { data: endorsementTranslations, error: endorsementTranslationsError }, { data: settings, error: settingsError }] = await Promise.all([
		supabase.from('partners').select('id, name, logo_media_id, website_url, display_order').eq('is_active', true).order('display_order').order('name'),
		supabase.from('partner_translations').select('partner_id, alt_text').eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('endorsements').select('id, partner_id, attribution_name, display_order').eq('is_active', true).order('display_order').order('attribution_name'),
		supabase.from('endorsement_translations').select('endorsement_id, quote, attribution_title').eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('site_settings').select('key, value').in('key', ['contact_footer', 'social_links']).eq('is_public', true),
	])
	const error = partnersError ?? partnerTranslationsError ?? endorsementsError ?? endorsementTranslationsError ?? settingsError
	if (error) throw new Error(`Unable to load public global content: ${error.message}`)

	const partnerTranslation = new Map((partnerTranslations ?? []).map((item) => [item.partner_id, item]))
	const visiblePartners = (partners ?? []).filter((partner) => partnerTranslation.has(partner.id) && partner.logo_media_id)
	const mediaIds = visiblePartners.flatMap((partner) => partner.logo_media_id ? [partner.logo_media_id] : [])
	const [{ data: media, error: mediaError }, { data: mediaTranslations, error: mediaTranslationsError }] = mediaIds.length ? await Promise.all([
		supabase.from('media_assets').select('id, bucket_id, object_path').in('id', mediaIds).eq('is_public', true),
		supabase.from('media_asset_translations').select('media_asset_id, alt_text').in('media_asset_id', mediaIds).eq('locale', locale),
	]) : [{ data: [], error: null }, { data: [], error: null }]
	if (mediaError || mediaTranslationsError) throw new Error(`Unable to load public partner media: ${mediaError?.message ?? mediaTranslationsError?.message}`)
	const mediaAlt = new Map((mediaTranslations ?? []).filter((item) => item.alt_text.trim()).map((item) => [item.media_asset_id, item.alt_text]))
	const mediaById = new Map((media ?? []).flatMap((item) => {
		const alt = mediaAlt.get(item.id)
		return alt ? [[item.id, { alt, url: supabase.storage.from(item.bucket_id).getPublicUrl(item.object_path).data.publicUrl }]] : []
	}))
	const publicPartners = visiblePartners.flatMap((partner) => {
		const logo = partner.logo_media_id ? mediaById.get(partner.logo_media_id) : null
		if (!logo) return []
		return [{ alt: logo.alt, id: partner.id, logoUrl: logo.url, name: partner.name, websiteUrl: safeWebUrl(partner.website_url) }]
	})

	const partnerNames = new Map(publicPartners.map((partner) => [partner.id, partner.name]))
	const translationsByEndorsement = new Map((endorsementTranslations ?? []).map((item) => [item.endorsement_id, item]))
	const publicEndorsements = (endorsements ?? []).flatMap((endorsement) => {
		const translation = translationsByEndorsement.get(endorsement.id)
		if (!translation) return []
		return [{ attributionName: endorsement.attribution_name, attributionTitle: translation.attribution_title, id: endorsement.id, partnerName: endorsement.partner_id ? partnerNames.get(endorsement.partner_id) ?? null : null, quote: translation.quote }]
	})

	const settingMap = new Map((settings ?? []).map((item) => [item.key, record(item.value)]))
	const contactValue = settingMap.get('contact_footer')
	const contact = contactValue ? { address: text(contactValue.address), email: text(contactValue.email), footerNote: text(contactValue.footerNote), phone: text(contactValue.phone) } : null
	const socialItems = settingMap.get('social_links')?.items
	const socials = Array.isArray(socialItems) ? socialItems.flatMap((item) => {
		const value = record(item)
		const platform = text(value.platform)
		const url = safeWebUrl(text(value.url))
		return platform && SOCIAL_PLATFORMS.has(platform) && url ? [{ platform, url }] : []
	}) : []

	return { contact, endorsements: publicEndorsements, partners: publicPartners, socials }
}

export const getPublishedGlobalContent = unstable_cache(
	loadPublishedGlobalContent,
	['published-global-content'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_GLOBAL_CACHE_TAG] },
)
