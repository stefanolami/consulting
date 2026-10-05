import { unstable_cache } from 'next/cache'
import { z } from 'zod'

import type { AppLocale } from '@/i18n/routing'
import { PUBLIC_OUTREACH_CACHE_TAG } from '@/lib/cache-tags'
import { createPublicClient } from '@/lib/supabase/public'

// One country of the Contact "Our global network" section: its localized
// name, the cities of its offices in order, and the distinct office email
// addresses. The schema has no country-level email; the legacy page showed one
// address per country, which the offices of a country share.
export type PublicOfficeCountry = {
	cities: string[]
	code: string
	emails: string[]
	name: string
}

const CACHE_REVALIDATE_SECONDS = 60 * 60

// Offices are grouped through `country_offices`, the relation the admin
// country editor orders. Every level must be public in the exact locale: an
// active office with a published translation, a covered country with a
// published translation, each with `published_at` not in the future. Nothing
// falls back to English. Countries follow their display order, then the
// localized name; offices follow the relation order, then their own.
async function loadPublishedOfficeNetwork(locale: AppLocale): Promise<PublicOfficeCountry[]> {
	const supabase = createPublicClient()
	const now = new Date().toISOString()
	const { data: relations, error: relationsError } = await supabase.from('country_offices').select('country_code, office_id, display_order').order('display_order').order('office_id')
	if (relationsError) throw new Error(`Unable to load office relationships: ${relationsError.message}`)
	if (!relations?.length) return []

	const officeIds = [...new Set(relations.map((relation) => relation.office_id))]
	const countryCodes = [...new Set(relations.map((relation) => relation.country_code))]
	const [offices, officeTranslations, countries, countryTranslations] = await Promise.all([
		supabase.from('offices').select('id, email, display_order').in('id', officeIds).eq('is_active', true),
		supabase.from('office_translations').select('office_id, name, city').in('office_id', officeIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('countries').select('code, display_order').in('code', countryCodes).eq('is_covered', true),
		supabase.from('country_translations').select('country_code, name').in('country_code', countryCodes).eq('locale', locale).eq('status', 'published').lte('published_at', now),
	])
	const error = offices.error ?? officeTranslations.error ?? countries.error ?? countryTranslations.error
	if (error) throw new Error(`Unable to load the localized office network: ${error.message}`)

	const officeById = new Map((offices.data ?? []).map((office) => [office.id, office]))
	const officeTranslationById = new Map((officeTranslations.data ?? []).map((translation) => [translation.office_id, translation]))
	const countryOrder = new Map((countries.data ?? []).map((country) => [country.code, country.display_order]))
	const countryName = new Map((countryTranslations.data ?? []).map((translation) => [translation.country_code, translation.name.trim()]))

	const grouped = new Map<string, Array<{ city: string; email: string | null; order: [number, number] }>>()
	for (const relation of relations) {
		const office = officeById.get(relation.office_id)
		const translation = officeTranslationById.get(relation.office_id)
		if (!office || !translation || !countryOrder.has(relation.country_code) || !countryName.get(relation.country_code)) continue
		const city = (translation.city ?? translation.name).trim()
		if (!city) continue
		const email = office.email?.trim() ?? ''
		const entries = grouped.get(relation.country_code) ?? []
		entries.push({ city, email: z.email().safeParse(email).success ? email : null, order: [relation.display_order, office.display_order] })
		grouped.set(relation.country_code, entries)
	}

	const collator = new Intl.Collator(locale)
	return [...grouped.entries()]
		.map(([code, entries]) => {
			entries.sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || collator.compare(a.city, b.city))
			return {
				cities: [...new Set(entries.map((entry) => entry.city))],
				code,
				emails: [...new Set(entries.flatMap((entry) => (entry.email ? [entry.email] : [])))],
				name: countryName.get(code) ?? code,
			}
		})
		.sort((a, b) => (countryOrder.get(a.code) ?? 0) - (countryOrder.get(b.code) ?? 0) || collator.compare(a.name, b.name))
}

// Office and country edits already invalidate the outreach tag (admin
// outreach actions), so the network shares it.
export const getPublishedOfficeNetwork = unstable_cache(
	loadPublishedOfficeNetwork,
	['published-office-network'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_OUTREACH_CACHE_TAG] },
)
