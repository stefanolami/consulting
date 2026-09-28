import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { routing, type AppLocale } from '@/i18n/routing'
import { PUBLIC_TEAM_CACHE_TAG } from '@/lib/cache-tags'
import { createPublicClient } from '@/lib/supabase/public'
import { parseProfileDocument, profileDocumentFromLegacy, type ProfileDocument } from '@/lib/team-profile-document'
import type { Database } from '@/types/database.generated'

const CACHE_REVALIDATE_SECONDS = 60 * 60

export type TeamGroup = Database['public']['Enums']['team_group']

export type TeamPortrait = {
	/** Localized alt text, then English; null when neither exists. */
	alt: string | null
	height: number | null
	url: string
	width: number | null
}

export type TeamCard = {
	group: TeamGroup
	id: string
	name: string
	portrait: TeamPortrait | null
	role: string | null
	slug: string
}

export type TeamProfile = {
	alternates: Array<{ locale: AppLocale; slug: string }>
	document: ProfileDocument
	email: string | null
	id: string
	name: string
	phone: string | null
	portrait: TeamPortrait | null
	roles: string[]
	seoDescription: string | null
	seoTitle: string | null
	slug: string
}

export const TEAM_GROUP_ORDER: readonly TeamGroup[] = ['managing_team', 'team']

function publicationTime() { return new Date().toISOString() }

async function loadPortraits(mediaIds: string[], locale: AppLocale): Promise<Map<string, TeamPortrait>> {
	if (!mediaIds.length) return new Map()
	const supabase = createPublicClient()
	const [{ data: assets, error: assetsError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('media_assets').select('id, bucket_id, object_path, width, height').in('id', mediaIds).eq('is_public', true),
		supabase.from('media_asset_translations').select('media_asset_id, locale, alt_text').in('media_asset_id', mediaIds).in('locale', [...new Set([locale, routing.defaultLocale])]),
	])
	if (assetsError || translationsError) throw new Error(`Unable to load team portraits: ${assetsError?.message ?? translationsError?.message}`)
	const alt = (id: string) => {
		const rows = (translations ?? []).filter((row) => row.media_asset_id === id && row.alt_text.trim())
		return rows.find((row) => row.locale === locale)?.alt_text ?? rows.find((row) => row.locale === routing.defaultLocale)?.alt_text ?? null
	}
	return new Map((assets ?? []).map((asset) => [asset.id, {
		alt: alt(asset.id),
		height: asset.height,
		url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl,
		width: asset.width,
	}]))
}

async function loadTeamListing(locale: AppLocale): Promise<TeamCard[]> {
	const supabase = createPublicClient()
	const { data: translations, error: translationsError } = await supabase.from('people_translations').select('person_id, slug, card_name')
		.eq('locale', locale).eq('status', 'published').lte('published_at', publicationTime())
	if (translationsError) throw new Error(`Unable to load team profiles: ${translationsError.message}`)
	const personIds = (translations ?? []).map((translation) => translation.person_id)
	if (!personIds.length) return []
	const [{ data: people, error: peopleError }, { data: roles, error: rolesError }] = await Promise.all([
		supabase.from('people').select('id, display_name, display_order, team_group, portrait_media_id').in('id', personIds)
			.eq('is_team_member', true).eq('is_active', true).order('display_order').order('display_name'),
		supabase.from('people_profile_roles').select('person_id, title, card_label').in('person_id', personIds).eq('locale', locale).eq('is_card_role', true),
	])
	if (peopleError || rolesError) throw new Error(`Unable to load team members: ${peopleError?.message ?? rolesError?.message}`)
	const portraits = await loadPortraits((people ?? []).flatMap((person) => person.portrait_media_id ? [person.portrait_media_id] : []), locale)
	const translationsByPerson = new Map((translations ?? []).map((translation) => [translation.person_id, translation]))
	const roleByPerson = new Map((roles ?? []).map((role) => [role.person_id, role.card_label || role.title]))
	const cards = (people ?? []).flatMap((person) => {
		const translation = translationsByPerson.get(person.id)
		if (!translation) return []
		return [{
			group: person.team_group,
			id: person.id,
			name: translation.card_name || person.display_name,
			portrait: person.portrait_media_id ? portraits.get(person.portrait_media_id) ?? null : null,
			role: roleByPerson.get(person.id) ?? null,
			slug: translation.slug,
		}]
	})
	return TEAM_GROUP_ORDER.flatMap((group) => cards.filter((card) => card.group === group))
}

function profileDocument(value: unknown, shortBio: string | null): ProfileDocument {
	try { return parseProfileDocument(value) } catch { return profileDocumentFromLegacy(shortBio, null) }
}

async function loadTeamProfile(locale: AppLocale, slug: string): Promise<TeamProfile | null> {
	const supabase = createPublicClient(); const now = publicationTime()
	const { data: translation, error: translationError } = await supabase.from('people_translations')
		.select('person_id, slug, card_name, profile_document, short_bio, seo_title, seo_description')
		.eq('locale', locale).eq('slug', slug).eq('status', 'published').lte('published_at', now).maybeSingle()
	if (translationError) throw new Error(`Unable to load this team profile: ${translationError.message}`)
	if (!translation) return null
	const [{ data: person, error: personError }, { data: roles, error: rolesError }, { data: alternates, error: alternatesError }] = await Promise.all([
		supabase.from('people').select('id, display_name, email, phone, portrait_media_id').eq('id', translation.person_id).eq('is_team_member', true).eq('is_active', true).maybeSingle(),
		supabase.from('people_profile_roles').select('title').eq('person_id', translation.person_id).eq('locale', locale).order('display_order'),
		supabase.from('people_translations').select('locale, slug').eq('person_id', translation.person_id).eq('status', 'published').lte('published_at', now),
	])
	if (personError || rolesError || alternatesError) throw new Error(`Unable to load this team member: ${personError?.message ?? rolesError?.message ?? alternatesError?.message}`)
	if (!person) return null
	const portraits = await loadPortraits(person.portrait_media_id ? [person.portrait_media_id] : [], locale)
	return {
		alternates: (alternates ?? []).filter((item) => routing.locales.includes(item.locale as AppLocale)).map((item) => ({ locale: item.locale as AppLocale, slug: item.slug })),
		document: profileDocument(translation.profile_document, translation.short_bio),
		email: person.email,
		id: person.id,
		name: translation.card_name || person.display_name,
		phone: person.phone,
		portrait: person.portrait_media_id ? portraits.get(person.portrait_media_id) ?? null : null,
		roles: (roles ?? []).map((role) => role.title),
		seoDescription: translation.seo_description,
		seoTitle: translation.seo_title,
		slug: translation.slug,
	}
}

export const getPublishedTeamListing = unstable_cache(loadTeamListing, ['published-team-listing'], { revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_TEAM_CACHE_TAG] })
// React cache() shares one read between generateMetadata and the page in the
// same request, so a cold data cache is not filled twice in parallel.
export const getPublishedTeamProfile = cache(unstable_cache(loadTeamProfile, ['published-team-profile'], { revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_TEAM_CACHE_TAG] }))
