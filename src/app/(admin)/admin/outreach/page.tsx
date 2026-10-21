import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { CountryFilters } from '@/components/admin/list-filters'
import { Pagination } from '@/components/admin/list-controls'
import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { Button } from '@/components/ui/button'
import { COUNTRY_LIST, COUNTRY_PAGE_SIZE, hasListFilters, parseListQuery } from '@/lib/admin-list-query.mjs'
import { loadCountryList } from '@/lib/admin-lists'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Our Outreach' }

type OutreachPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

async function loadRegions() {
	const supabase = await createClient()
	const [{ data: regions, error: regionError }, { data: regionTranslations, error: regionTranslationError }, { count: officeCount, error: officeError }] = await Promise.all([
		supabase.from('regions').select('id, stable_key, is_active').order('display_order').order('stable_key'),
		supabase.from('region_translations').select('region_id, name').eq('locale', 'en'),
		supabase.from('offices').select('id', { count: 'exact', head: true }),
	])
	if (regionError || regionTranslationError || officeError) throw new Error(`Unable to load Our Outreach records: ${regionError?.message ?? regionTranslationError?.message ?? officeError?.message}`)
	return {
		officeCount: officeCount ?? 0,
		regions: (regions ?? []).map((region) => ({ id: region.id, isActive: region.is_active, label: (regionTranslations ?? []).find((item) => item.region_id === region.id)?.name ?? region.stable_key })),
	}
}

export default async function OutreachPage({ searchParams }: OutreachPageProps) {
	const { officeCount, regions } = await loadRegions()
	return (
		<div className="mx-auto max-w-6xl">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Our Outreach administration</p>
			<div className="mt-2 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Countries and coverage</h1>
					<p className="mt-3 max-w-3xl leading-7 text-slate-600">Maintain ISO country identity, coverage, localized editorial content, ordered services and experts, country statistics, offices, and only the existing map focus configuration. Public map and country templates remain deferred.</p>
				</div>
				<Button asChild><Link href="/admin/outreach/new">New country</Link></Button>
			</div>
			<div className="mt-7 flex flex-wrap gap-3">
				<Button asChild variant="outline"><Link href="/admin/outreach/regions">Manage regions ({regions.length})</Link></Button>
				<Button asChild variant="outline"><Link href="/admin/outreach/offices">Manage offices ({officeCount})</Link></Button>
			</div>
			<section aria-labelledby="countries-heading" className="mt-8 space-y-4">
				<h2 className="sr-only" id="countries-heading">Country list</h2>
				<CountryFilters regions={regions.map((region) => ({ id: region.id, label: region.isActive ? region.label : `${region.label} (archived)` }))} />
				<Suspense fallback={<div aria-busy="true" aria-label="Loading countries" className="h-96 animate-pulse rounded-xl bg-white" role="status" />}>
					<CountryTable regions={regions} searchParams={searchParams} />
				</Suspense>
			</section>
		</div>
	)
}

async function CountryTable({ regions, searchParams }: OutreachPageProps & { regions: { id: string; label: string }[] }) {
	const state = parseListQuery(COUNTRY_LIST, await searchParams)
	const list = await loadCountryList(state)
	const filtered = hasListFilters(COUNTRY_LIST, state)
	const regionName = (id: string | null) => (id ? regions.find((region) => region.id === id)?.label ?? 'Unknown region' : 'No region')
	return (
		<>
			<LocaleStatesLegend />
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div className="overflow-x-auto">
					<table className="w-full min-w-190 text-left text-sm">
						<caption className="sr-only">Countries{filtered ? ' matching the search and filters' : ''}, by display order and ISO code</caption>
						<thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-5 py-3" scope="col">ISO</th>
								<th className="px-5 py-3" scope="col">Country</th>
								<th className="px-5 py-3" scope="col">Languages</th>
								<th className="px-5 py-3" scope="col">Coverage</th>
								<th className="px-5 py-3" scope="col">Order</th>
							</tr>
						</thead>
						<tbody>
							{list.items.map((country) => (
								<tr className="border-b border-slate-100 last:border-0" key={country.code}>
									<td className="px-5 py-3.5 font-mono text-slate-600">{country.code}</td>
									<td className="px-5 py-3.5">
										<Link className="font-semibold text-slate-950 underline-offset-4 hover:underline" href={`/admin/outreach/${country.code}`}>{country.name ?? 'Untitled English translation'}</Link>
										<p className="mt-0.5 text-xs text-slate-500">{regionName(country.regionId)}</p>
									</td>
									<td className="px-5 py-3.5"><LocaleStates states={country.states} /></td>
									<td className={country.isCovered ? 'px-5 py-3.5 font-medium text-emerald-700' : 'px-5 py-3.5 text-slate-500'}>{country.isCovered ? 'Covered' : 'Not covered'}</td>
									<td className="px-5 py-3.5 text-slate-600">{country.displayOrder}</td>
								</tr>
							))}
							{!list.items.length && <tr><td className="px-5 py-14 text-center text-slate-500" colSpan={5}>{filtered ? 'No countries match this search and these filters.' : 'No countries have been created.'}</td></tr>}
						</tbody>
					</table>
				</div>
			</div>
			<Pagination label="Country pages" page={list.page} pageSize={COUNTRY_PAGE_SIZE} spec={COUNTRY_LIST} total={list.total} />
		</>
	)
}
