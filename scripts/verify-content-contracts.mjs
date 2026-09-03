import assert from 'node:assert/strict'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !publicKey || !secretKey) throw new Error('Supabase URL, publishable key, and secret key are required.')

const options = { auth: { autoRefreshToken: false, persistSession: false } }
const anon = createClient(url, publicKey, options)
const service = createClient(url, secretKey, options)
const now = new Date().toISOString()

const country = await one(anon.from('countries').select('code, flag_media_id, outline_media_id, is_covered, last_reviewed_on').eq('code', 'BR'), 'public Brazil country')
assert.equal(country.is_covered, true)
assert.equal(country.last_reviewed_on, '2026-09-03')
assert.ok(country.flag_media_id && country.outline_media_id)

const countryTranslation = await one(anon.from('country_translations').select('slug, name, summary, content, coverage_summary, seo_title, seo_description, status, published_at').eq('country_code', 'BR').eq('locale', 'en'), 'public Brazil translation')
assert.equal(countryTranslation.status, 'published')
assert.ok(countryTranslation.published_at <= now)
assert.equal(countryTranslation.slug, 'brazil')
assert.ok(countryTranslation.summary && countryTranslation.coverage_summary && countryTranslation.seo_title && countryTranslation.seo_description)
assert.ok(Array.isArray(countryTranslation.content.content) && countryTranslation.content.content.length)

const countryServices = await many(anon.from('country_services').select('service_id, coverage_level, display_order').eq('country_code', 'BR').order('display_order'), 'public Brazil services')
assert.equal(countryServices.length, 4)
assert.ok(countryServices.every((item) => item.coverage_level === null))
const serviceIds = countryServices.map((item) => item.service_id)
assert.equal((await many(anon.from('country_service_translations').select('service_id, summary, content').eq('country_code', 'BR').eq('locale', 'en').in('service_id', serviceIds), 'public Brazil service translations')).length, 4)

const statistics = await many(anon.from('country_statistics').select('id, metric_key, numeric_value, unit, statistic_year, source_url').eq('country_code', 'BR'), 'public Brazil statistics')
assert.equal(statistics.length, 1)
assert.equal(statistics[0].metric_key, 'legacy-office-locations')
assert.equal(Number(statistics[0].numeric_value), 3)
assert.equal((await many(anon.from('country_statistic_translations').select('label, display_value').eq('statistic_id', statistics[0].id).eq('locale', 'en'), 'public Brazil statistic translation')).length, 1)

const countryOffices = await many(anon.from('country_offices').select('office_id, display_order').eq('country_code', 'BR').order('display_order'), 'public Brazil office relationships')
assert.equal(countryOffices.length, 3)
const officeIds = countryOffices.map((item) => item.office_id)
const offices = await many(anon.from('offices').select('id, email, phone, latitude, longitude').in('id', officeIds), 'public Brazil offices')
assert.equal(offices.length, 3)
assert.ok(offices.every((office) => office.email === 'brazil@consultingontap.com' && office.phone === null && office.latitude === null && office.longitude === null))
assert.equal((await many(anon.from('office_translations').select('office_id, name, city, address, status').in('office_id', officeIds).eq('locale', 'en'), 'public Brazil office translations')).length, 3)
assert.equal((await many(anon.from('country_people').select('person_id, relationship').eq('country_code', 'BR').eq('relationship', 'expert'), 'public Brazil experts')).length, 1)

const articles = await many(anon.from('article_translations').select('article_id, slug, content').eq('locale', 'en').eq('status', 'published').lte('published_at', now).in('slug', ['the-european-union-and-latin-america-a-herculean-matter', 'europe-space-economy-turning-flagship-projects-into-growth-markets']), 'public article translations')
assert.equal(articles.length, 2)
const inlineMediaIds = articles.map((article) => {
	assert.equal(article.content.attrs?.schemaVersion, 2)
	const images = article.content.content.filter((node) => node.type === 'articleImage')
	assert.equal(images.length, 1)
	assert.ok(['content', 'wide', 'fullBleed'].includes(images[0].attrs.layout))
	assert.ok(images[0].attrs.alt.length >= 3)
	assert.equal(Object.hasOwn(images[0].attrs, 'src'), false)
	return images[0].attrs.mediaId
})
const expectedMediaIds = [country.flag_media_id, country.outline_media_id, ...inlineMediaIds]
assert.equal((await many(anon.from('media_assets').select('id').in('id', expectedMediaIds).eq('is_public', true), 'public managed media')).length, expectedMediaIds.length)
assert.equal((await many(anon.from('media_asset_translations').select('media_asset_id, alt_text').in('media_asset_id', expectedMediaIds).eq('locale', 'en'), 'public managed-media translations')).length, expectedMediaIds.length)

const partner = await one(anon.from('partners').select('id, name, logo_media_id, website_url').eq('stable_key', 'effa'), 'public EFFA partner')
assert.ok(partner.logo_media_id)
assert.equal((await many(anon.from('partner_translations').select('alt_text').eq('partner_id', partner.id).eq('locale', 'en'), 'public EFFA translation')).length, 1)
assert.equal((await many(anon.from('partner_translations').select('alt_text').eq('partner_id', partner.id).eq('locale', 'pt-BR'), 'missing exact-locale EFFA translation')).length, 0)
const endorsement = await one(anon.from('endorsements').select('id, partner_id, portrait_media_id, attribution_name').eq('stable_key', 'alexander-mohr-effa'), 'public EFFA endorsement')
assert.equal(endorsement.partner_id, partner.id)
assert.equal(endorsement.portrait_media_id, null)
assert.equal((await many(anon.from('endorsement_translations').select('quote, attribution_title').eq('endorsement_id', endorsement.id).eq('locale', 'en'), 'public EFFA endorsement translation')).length, 1)

const settings = await many(anon.from('site_settings').select('key, value, is_public').in('key', ['contact_footer', 'social_links', 'poe_external_link', 'approved_calls_to_action']), 'public site settings')
assert.deepEqual(settings.map((item) => item.key).sort(), ['contact_footer', 'social_links'])
assert.ok(settings.every((item) => item.is_public))

const draft = await maybe(service.from('country_translations').select('country_code, locale').neq('status', 'published').limit(1), 'service-role draft probe')
if (draft) {
	const hidden = await many(anon.from('country_translations').select('country_code').eq('country_code', draft.country_code).eq('locale', draft.locale).neq('status', 'published'), 'anonymous unpublished-content probe')
	assert.equal(hidden.length, 0)
}

console.log([
	'ANONYMOUS CONTENT-CONTRACT VERIFICATION',
	'- Article documents: 2 version-2 documents with managed inline images',
	'- Brazil: rich content, 4 services, 1 statistic, 3 offices, 1 expert, flag/outline media, and SEO',
	'- Global content: 1 exact-locale partner, 1 endorsement, and 2 public site settings',
	`- Anonymous RLS: unpublished country translation ${draft ? 'was hidden' : 'probe unavailable (no draft existed)'}`,
	'- Legacy-source gaps remain null/absent: office addresses/phones/coordinates, coverage tiers, POE link, calls to action',
].join('\n'))

async function many(query, label) { const { data, error } = await query; if (error) throw new Error(`Unable to verify ${label}: ${error.message}`); return data ?? [] }
async function one(query, label) { const rows = await many(query, label); assert.equal(rows.length, 1, `${label} should return exactly one row`); return rows[0] }
async function maybe(query, label) { return (await many(query, label))[0] ?? null }
