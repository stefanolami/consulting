import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Our Outreach' }

export default async function OutreachPage() {
	const supabase = await createClient()
	const [{ data: countries, error: countryError }, { data: translations, error: translationError }, { data: regions, error: regionError }, { data: offices, error: officeError }] = await Promise.all([
		supabase.from('countries').select('code, region_id, is_covered, display_order, last_reviewed_on').order('display_order').order('code'),
		supabase.from('country_translations').select('country_code, locale, name, status'),
		supabase.from('regions').select('id, stable_key, is_active').order('display_order').order('stable_key'),
		supabase.from('offices').select('id, is_active'),
	])
	if (countryError || translationError || regionError || officeError) throw new Error(`Unable to load Our Outreach records: ${countryError?.message ?? translationError?.message ?? regionError?.message ?? officeError?.message}`)
	return <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Our Outreach administration</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Countries and coverage</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Maintain ISO country identity, coverage, localized editorial content, ordered services and experts, country statistics, offices, and only the existing map focus configuration. Public map and country templates remain deferred.</p></div><Button asChild><Link href="/admin/outreach/new">New country</Link></Button></div><div className="mt-7 flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/admin/outreach/regions">Manage regions ({(regions ?? []).length})</Link></Button><Button asChild variant="outline"><Link href="/admin/outreach/offices">Manage offices ({(offices ?? []).length})</Link></Button></div><div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="hidden grid-cols-[7rem_minmax(14rem,1fr)_11rem_9rem_8rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>ISO</span><span>Country</span><span>Locales</span><span>Coverage</span><span>Order</span></div>{(countries ?? []).length ? (countries ?? []).map((country) => { const entries = (translations ?? []).filter((translation) => translation.country_code === country.code); const english = entries.find((translation) => translation.locale === 'en'); return <div className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[7rem_minmax(14rem,1fr)_11rem_9rem_8rem] md:items-center md:gap-4" key={country.code}><span className="font-mono text-sm text-slate-600">{country.code}</span><div><Link className="font-semibold text-slate-950 underline-offset-4 hover:underline" href={`/admin/outreach/${country.code}`}>{english?.name ?? 'Untitled English translation'}</Link><p className="mt-0.5 text-sm text-slate-500">{english?.status ?? 'No English content'}</p></div><span className="text-sm text-slate-600">{entries.map((entry) => entry.locale.toUpperCase()).join(', ') || '—'}</span><span className={country.is_covered ? 'text-sm font-medium text-emerald-700' : 'text-sm text-slate-500'}>{country.is_covered ? 'Covered' : 'Not covered'}</span><span className="text-sm text-slate-600">{country.display_order}</span></div> }) : <p className="px-5 py-14 text-center text-sm text-slate-500">No countries have been created.</p>}</div></div>
}
