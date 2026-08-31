import { unstable_cache } from 'next/cache'

import type { AppLocale } from '@/i18n/routing'
import { routing } from '@/i18n/routing'
import { PUBLIC_OUTREACH_CACHE_TAG } from '@/lib/cache-tags'
import { createPublicClient } from '@/lib/supabase/public'
import type { Json } from '@/types/database.generated'

export type OutreachMedia = {
	alt: string
	caption: string | null
	url: string
}

export type OutreachRegion = {
	id: string
	name: string
}

export type OutreachService = {
	content: Json
	coverageLevel: string | null
	id: string
	name: string
	slug: string
	summary: string | null
}

export type OutreachStatistic = {
	displayValue: string | null
	id: string
	label: string
	numericValue: number | null
	sourceUrl: string | null
	unit: string | null
	year: number | null
}

export type OutreachOffice = {
	address: string | null
	city: string | null
	email: string | null
	id: string
	latitude: number | null
	longitude: number | null
	name: string
	phone: string | null
}

export type OutreachPerson = {
	email: string | null
	id: string
	name: string
	phone: string | null
	portrait: OutreachMedia | null
	profileSlug: string | null
	relationship: string
	role: string | null
}

export type OutreachCountry = {
	alternates: Array<{ locale: AppLocale; slug: string }>
	code: string
	content: Json
	coverageSummary: string | null
	flag: OutreachMedia | null
	name: string
	offices: OutreachOffice[]
	outline: OutreachMedia | null
	people: OutreachPerson[]
	region: OutreachRegion | null
	seoDescription: string | null
	seoTitle: string | null
	services: OutreachService[]
	slug: string
	statistics: OutreachStatistic[]
	summary: string | null
}

type CountryTranslation = {
	code: string
	content: Json
	coverageSummary: string | null
	name: string
	seoDescription: string | null
	seoTitle: string | null
	slug: string
	summary: string | null
}

type CanonicalCountry = {
	code: string
	flagMediaId: string | null
	outlineMediaId: string | null
	regionId: string | null
}

const CACHE_REVALIDATE_SECONDS = 60 * 60

function publicationTime() {
	return new Date().toISOString()
}

function unique(values: Array<string | null>) {
	return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

async function publishedCountryTranslations(locale: AppLocale, slug?: string): Promise<CountryTranslation[]> {
	let query = createPublicClient()
		.from('country_translations')
		.select('country_code, slug, name, summary, content, coverage_summary, seo_title, seo_description')
		.eq('locale', locale)
		.eq('status', 'published')
		.lte('published_at', publicationTime())
	if (slug) query = query.eq('slug', slug)
	const { data, error } = await query
	if (error) throw new Error(`Unable to load published outreach countries: ${error.message}`)
	return (data ?? []).map((row) => ({
		code: row.country_code,
		content: row.content,
		coverageSummary: row.coverage_summary,
		name: row.name,
		seoDescription: row.seo_description,
		seoTitle: row.seo_title,
		slug: row.slug,
		summary: row.summary,
	}))
}

async function coveredCountries(countryCodes: string[]): Promise<CanonicalCountry[]> {
	if (!countryCodes.length) return []
	const { data, error } = await createPublicClient()
		.from('countries')
		.select('code, region_id, flag_media_id, outline_media_id, display_order')
		.in('code', countryCodes)
		.eq('is_covered', true)
		.order('display_order')
		.order('code')
	if (error) throw new Error(`Unable to load covered outreach countries: ${error.message}`)
	return (data ?? []).map((row) => ({
		code: row.code,
		flagMediaId: row.flag_media_id,
		outlineMediaId: row.outline_media_id,
		regionId: row.region_id,
	}))
}

async function localizedMedia(mediaIds: string[], locale: AppLocale): Promise<Map<string, OutreachMedia>> {
	if (!mediaIds.length) return new Map()
	const supabase = createPublicClient()
	const [{ data: assets, error: assetsError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('media_assets').select('id, bucket_id, object_path').in('id', mediaIds).eq('is_public', true),
		supabase.from('media_asset_translations').select('media_asset_id, alt_text, caption').in('media_asset_id', mediaIds).eq('locale', locale),
	])
	if (assetsError || translationsError) {
		throw new Error(`Unable to load localized outreach media: ${assetsError?.message ?? translationsError?.message}`)
	}
	const metadata = new Map((translations ?? []).filter((row) => row.alt_text.trim()).map((row) => [row.media_asset_id, row]))
	return new Map((assets ?? []).flatMap((asset) => {
		const translation = metadata.get(asset.id)
		if (!translation) return []
		return [[asset.id, {
			alt: translation.alt_text,
			caption: translation.caption,
			url: supabase.storage.from(asset.bucket_id).getPublicUrl(asset.object_path).data.publicUrl,
		}]]
	}))
}

async function localizedRegions(countries: CanonicalCountry[], locale: AppLocale): Promise<Map<string, OutreachRegion>> {
	const regionIds = unique(countries.map((country) => country.regionId))
	if (!regionIds.length) return new Map()
	const supabase = createPublicClient()
	const now = publicationTime()
	const [{ data: regions, error: regionsError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('regions').select('id').in('id', regionIds).eq('is_active', true),
		supabase.from('region_translations').select('region_id, name').in('region_id', regionIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
	])
	if (regionsError || translationsError) throw new Error(`Unable to load localized outreach regions: ${regionsError?.message ?? translationsError?.message}`)
	const active = new Set((regions ?? []).map((region) => region.id))
	return new Map((translations ?? []).filter((translation) => active.has(translation.region_id)).map((translation) => [translation.region_id, { id: translation.region_id, name: translation.name }]))
}

async function localizedServices(countryCodes: string[], locale: AppLocale): Promise<Map<string, OutreachService[]>> {
	if (!countryCodes.length) return new Map()
	const supabase = createPublicClient()
	const { data: relations, error: relationsError } = await supabase.from('country_services').select('country_code, service_id, coverage_level, display_order').in('country_code', countryCodes).order('display_order').order('service_id')
	if (relationsError) throw new Error(`Unable to load outreach service relationships: ${relationsError.message}`)
	const serviceIds = unique((relations ?? []).map((relation) => relation.service_id))
	if (!serviceIds.length) return new Map()
	const now = publicationTime()
	const [{ data: services, error: servicesError }, { data: translations, error: translationsError }, { data: countryTranslations, error: countryTranslationsError }] = await Promise.all([
		supabase.from('services').select('id').in('id', serviceIds).eq('is_active', true),
		supabase.from('service_translations').select('service_id, slug, name').in('service_id', serviceIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('country_service_translations').select('country_code, service_id, summary, content').in('country_code', countryCodes).in('service_id', serviceIds).eq('locale', locale),
	])
	if (servicesError || translationsError || countryTranslationsError) throw new Error(`Unable to load localized outreach services: ${servicesError?.message ?? translationsError?.message ?? countryTranslationsError?.message}`)
	const active = new Set((services ?? []).map((service) => service.id))
	const translationById = new Map((translations ?? []).filter((translation) => active.has(translation.service_id)).map((translation) => [translation.service_id, translation]))
	const countryCopy = new Map((countryTranslations ?? []).map((translation) => [`${translation.country_code}:${translation.service_id}`, translation]))
	const result = new Map<string, OutreachService[]>()
	for (const relation of relations ?? []) {
		const translation = translationById.get(relation.service_id)
		if (!translation) continue
		const copy = countryCopy.get(`${relation.country_code}:${relation.service_id}`)
		result.set(relation.country_code, [...(result.get(relation.country_code) ?? []), {
			content: copy?.content ?? { type: 'doc', content: [] },
			coverageLevel: relation.coverage_level,
			id: relation.service_id,
			name: translation.name,
			slug: translation.slug,
			summary: copy?.summary ?? null,
		}])
	}
	return result
}

async function localizedStatistics(countryCodes: string[], locale: AppLocale): Promise<Map<string, OutreachStatistic[]>> {
	if (!countryCodes.length) return new Map()
	const supabase = createPublicClient()
	const { data: statistics, error: statisticsError } = await supabase.from('country_statistics').select('id, country_code, numeric_value, unit, statistic_year, source_url, display_order').in('country_code', countryCodes).order('display_order').order('id')
	if (statisticsError) throw new Error(`Unable to load outreach statistics: ${statisticsError.message}`)
	const statisticIds = unique((statistics ?? []).map((statistic) => statistic.id))
	if (!statisticIds.length) return new Map()
	const { data: translations, error: translationsError } = await supabase.from('country_statistic_translations').select('statistic_id, label, display_value').in('statistic_id', statisticIds).eq('locale', locale)
	if (translationsError) throw new Error(`Unable to load localized outreach statistics: ${translationsError.message}`)
	const translationById = new Map((translations ?? []).map((translation) => [translation.statistic_id, translation]))
	const result = new Map<string, OutreachStatistic[]>()
	for (const statistic of statistics ?? []) {
		const translation = translationById.get(statistic.id)
		if (!translation) continue
		result.set(statistic.country_code, [...(result.get(statistic.country_code) ?? []), {
			displayValue: translation.display_value,
			id: statistic.id,
			label: translation.label,
			numericValue: statistic.numeric_value,
			sourceUrl: statistic.source_url,
			unit: statistic.unit,
			year: statistic.statistic_year,
		}])
	}
	return result
}

async function localizedOffices(countryCodes: string[], locale: AppLocale): Promise<Map<string, OutreachOffice[]>> {
	if (!countryCodes.length) return new Map()
	const supabase = createPublicClient()
	const { data: relations, error: relationsError } = await supabase.from('country_offices').select('country_code, office_id, display_order').in('country_code', countryCodes).order('display_order').order('office_id')
	if (relationsError) throw new Error(`Unable to load outreach office relationships: ${relationsError.message}`)
	const officeIds = unique((relations ?? []).map((relation) => relation.office_id))
	if (!officeIds.length) return new Map()
	const now = publicationTime()
	const [{ data: offices, error: officesError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('offices').select('id, email, phone, latitude, longitude').in('id', officeIds).eq('is_active', true),
		supabase.from('office_translations').select('office_id, name, city, address').in('office_id', officeIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
	])
	if (officesError || translationsError) throw new Error(`Unable to load localized outreach offices: ${officesError?.message ?? translationsError?.message}`)
	const officeById = new Map((offices ?? []).map((office) => [office.id, office]))
	const translationById = new Map((translations ?? []).map((translation) => [translation.office_id, translation]))
	const result = new Map<string, OutreachOffice[]>()
	for (const relation of relations ?? []) {
		const office = officeById.get(relation.office_id)
		const translation = translationById.get(relation.office_id)
		if (!office || !translation) continue
		result.set(relation.country_code, [...(result.get(relation.country_code) ?? []), {
			address: translation.address,
			city: translation.city,
			email: office.email,
			id: office.id,
			latitude: office.latitude,
			longitude: office.longitude,
			name: translation.name,
			phone: office.phone,
		}])
	}
	return result
}

async function localizedPeople(countryCodes: string[], locale: AppLocale): Promise<{ mediaIds: string[]; people: Map<string, (Omit<OutreachPerson, 'portrait'> & { portraitMediaId: string | null })[]> }> {
	if (!countryCodes.length) return { mediaIds: [], people: new Map() }
	const supabase = createPublicClient()
	const { data: relations, error: relationsError } = await supabase.from('country_people').select('country_code, person_id, relationship, display_order').in('country_code', countryCodes).order('display_order').order('person_id').order('relationship')
	if (relationsError) throw new Error(`Unable to load outreach people relationships: ${relationsError.message}`)
	const personIds = unique((relations ?? []).map((relation) => relation.person_id))
	if (!personIds.length) return { mediaIds: [], people: new Map() }
	const now = publicationTime()
	const [{ data: people, error: peopleError }, { data: translations, error: translationsError }, { data: roles, error: rolesError }] = await Promise.all([
		supabase.from('people').select('id, display_name, email, phone, portrait_media_id, is_team_member').in('id', personIds).eq('is_active', true),
		supabase.from('people_translations').select('person_id, slug, card_name').in('person_id', personIds).eq('locale', locale).eq('status', 'published').lte('published_at', now),
		supabase.from('people_profile_roles').select('person_id, title, card_label').in('person_id', personIds).eq('locale', locale).eq('is_card_role', true),
	])
	if (peopleError || translationsError || rolesError) throw new Error(`Unable to load localized outreach people: ${peopleError?.message ?? translationsError?.message ?? rolesError?.message}`)
	const peopleById = new Map((people ?? []).map((person) => [person.id, person]))
	const translationById = new Map((translations ?? []).map((translation) => [translation.person_id, translation]))
	const roleById = new Map((roles ?? []).map((role) => [role.person_id, role.card_label || role.title]))
	const result = new Map<string, (Omit<OutreachPerson, 'portrait'> & { portraitMediaId: string | null })[]>()
	for (const relation of relations ?? []) {
		const person = peopleById.get(relation.person_id)
		const translation = translationById.get(relation.person_id)
		if (!person || !translation) continue
		result.set(relation.country_code, [...(result.get(relation.country_code) ?? []), {
			email: person.email,
			id: person.id,
			name: translation.card_name || person.display_name,
			phone: person.phone,
			portraitMediaId: person.portrait_media_id,
			profileSlug: person.is_team_member ? translation.slug : null,
			relationship: relation.relationship,
			role: roleById.get(person.id) ?? null,
		}])
	}
	return { mediaIds: unique((people ?? []).map((person) => person.portrait_media_id)), people: result }
}

async function loadAlternates(countryCode: string): Promise<Array<{ locale: AppLocale; slug: string }>> {
	const { data, error } = await createPublicClient().from('country_translations').select('locale, slug').eq('country_code', countryCode).eq('status', 'published').lte('published_at', publicationTime())
	if (error) throw new Error(`Unable to load country language alternates: ${error.message}`)
	return (data ?? []).flatMap((translation) => routing.locales.includes(translation.locale as AppLocale) ? [{ locale: translation.locale as AppLocale, slug: translation.slug }] : [])
}

async function loadOutreachCountries(locale: AppLocale, slug?: string): Promise<OutreachCountry[]> {
	const translations = await publishedCountryTranslations(locale, slug)
	const countries = await coveredCountries(translations.map((translation) => translation.code))
	if (!countries.length) return []
	const countryCodes = countries.map((country) => country.code)
	const translationByCode = new Map(translations.map((translation) => [translation.code, translation]))
	const [regions, services, statistics, offices, peopleResult] = await Promise.all([
		localizedRegions(countries, locale),
		localizedServices(countryCodes, locale),
		localizedStatistics(countryCodes, locale),
		localizedOffices(countryCodes, locale),
		localizedPeople(countryCodes, locale),
	])
	const media = await localizedMedia(unique([
		...countries.flatMap((country) => [country.flagMediaId, country.outlineMediaId]),
		...peopleResult.mediaIds,
	]), locale)
	return Promise.all(countries.flatMap((country) => {
		const translation = translationByCode.get(country.code)
		if (!translation) return []
		return [Promise.resolve(slug ? loadAlternates(country.code) : []).then((alternates) => ({
			alternates,
			code: country.code,
			content: translation.content,
			coverageSummary: translation.coverageSummary,
			flag: country.flagMediaId ? media.get(country.flagMediaId) ?? null : null,
			name: translation.name,
			offices: offices.get(country.code) ?? [],
			outline: country.outlineMediaId ? media.get(country.outlineMediaId) ?? null : null,
			people: (peopleResult.people.get(country.code) ?? []).map(({ portraitMediaId, ...person }) => ({ ...person, portrait: portraitMediaId ? media.get(portraitMediaId) ?? null : null })),
			region: country.regionId ? regions.get(country.regionId) ?? null : null,
			seoDescription: translation.seoDescription,
			seoTitle: translation.seoTitle,
			services: services.get(country.code) ?? [],
			slug: translation.slug,
			statistics: statistics.get(country.code) ?? [],
			summary: translation.summary,
		}))]
	}))
}

async function loadOutreachOverview(locale: AppLocale) {
	return loadOutreachCountries(locale)
}

async function loadOutreachDetail(locale: AppLocale, slug: string) {
	return (await loadOutreachCountries(locale, slug))[0] ?? null
}

export const getPublishedOutreachOverview = unstable_cache(
	loadOutreachOverview,
	['published-outreach-overview'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_OUTREACH_CACHE_TAG] },
)

export const getPublishedOutreachDetail = unstable_cache(
	loadOutreachDetail,
	['published-outreach-detail'],
	{ revalidate: CACHE_REVALIDATE_SECONDS, tags: [PUBLIC_OUTREACH_CACHE_TAG] },
)
