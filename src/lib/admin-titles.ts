import 'server-only'

import { cache } from 'react'

import { looseClient, record, rows, text } from '@/lib/admin-query'

/*
 * Browser-tab titles of the admin's record pages (audit X-14): the record's
 * English name, else its stable key, followed by the layout's
 * "| Time&Place Admin". A record that cannot be read gets the type's name.
 */

type RecordType = 'person' | 'service' | 'sector' | 'article' | 'tag' | 'country' | 'region' | 'office' | 'partner' | 'endorsement'

// table, key column, fallback column, English-name source (translation table, foreign key, name column) or null when the name is on the row.
const SOURCES: Record<RecordType, { table: string; key: string; fallback: string; english: [string, string, string] | null; noun: string }> = {
	person: { table: 'people', key: 'id', fallback: 'display_name', english: null, noun: 'Team profile' },
	service: { table: 'services', key: 'id', fallback: 'stable_key', english: ['service_translations', 'service_id', 'name'], noun: 'Service' },
	sector: { table: 'sectors', key: 'id', fallback: 'stable_key', english: ['sector_translations', 'sector_id', 'name'], noun: 'Sector' },
	article: { table: 'articles', key: 'id', fallback: 'stable_key', english: ['article_translations', 'article_id', 'title'], noun: 'Article' },
	tag: { table: 'tags', key: 'id', fallback: 'stable_key', english: ['tag_translations', 'tag_id', 'name'], noun: 'Tag' },
	country: { table: 'countries', key: 'code', fallback: 'code', english: ['country_translations', 'country_code', 'name'], noun: 'Country' },
	region: { table: 'regions', key: 'id', fallback: 'stable_key', english: ['region_translations', 'region_id', 'name'], noun: 'Region' },
	office: { table: 'offices', key: 'id', fallback: 'stable_key', english: ['office_translations', 'office_id', 'name'], noun: 'Office' },
	partner: { table: 'partners', key: 'id', fallback: 'name', english: null, noun: 'Partner' },
	endorsement: { table: 'endorsements', key: 'id', fallback: 'attribution_name', english: null, noun: 'Endorsement' },
}

export const adminRecordTitle = cache(async (type: RecordType, id: string) => {
	const source = SOURCES[type]
	const supabase = await looseClient()
	const value = type === 'country' ? id.toUpperCase() : id
	const [{ data: base }, english] = await Promise.all([
		supabase.from(source.table).select(source.fallback).eq(source.key, value).limit(1),
		source.english ? supabase.from(source.english[0]).select(source.english[2]).eq(source.english[1], value).eq('locale', 'en').limit(1) : Promise.resolve({ data: [] }),
	])
	const name = source.english ? text(record(rows(english.data)[0])[source.english[2]]) : ''
	const fallback = text(record(rows(base)[0])[source.fallback])
	return name || fallback || source.noun
})
