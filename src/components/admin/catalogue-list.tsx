'use client'

import { Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

import { moveCatalogueAction } from '@/app/(admin)/admin/actions'
import type { CatalogueKind } from '@/app/(admin)/admin/actions'
import { CommandNotice, useAdminCommand } from '@/components/admin/form/admin-form'
import type { PublicationStatus } from '@/components/admin/form/locale-tabs'
import { SearchField, useListQuery, ViewSwitch } from '@/components/admin/list-controls'
import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { ReorderControls, ReorderNote } from '@/components/admin/reorder-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CATALOGUE_LIST } from '@/lib/admin-list-query.mjs'
import { moveAvailability, sortByDisplayOrder } from '@/lib/display-order.mjs'

type Item = { id: string; kind: CatalogueKind; stableKey: string; name: string | null; displayOrder: number; isActive: boolean; states: Record<string, PublicationStatus | null>; status: string | null }

const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_14rem_7rem_9rem]'

export function CatalogueList({ items }: { items: Item[] }) {
	const { hrefFor, state, update } = useListQuery(CATALOGUE_LIST, 'history')
	const kind = state.kind as CatalogueKind
	const move = useAdminCommand(moveCatalogueAction)
	const searching = state.q !== ''
	const { availability, visible } = useMemo(() => {
		const ofKind = sortByDisplayOrder(items.filter((item) => item.kind === kind).map((item) => ({ ...item, order: item.displayOrder, tieBreak: item.stableKey })))
		const query = state.q.toLowerCase()
		return {
			availability: moveAvailability(ofKind, (item) => item.isActive),
			visible: query ? ofKind.filter((item) => `${item.name ?? ''} ${item.stableKey}`.toLowerCase().includes(query)) : ofKind,
		}
	}, [items, kind, state.q])
	const singular = kind === 'services' ? 'service' : 'sector'

	return (
		<div className="space-y-6">
			<ViewSwitch
				current={kind}
				items={(['services', 'sectors'] as const).map((value) => ({ value, label: value === 'services' ? 'Services' : 'Sectors', href: hrefFor({ kind: value }), count: items.filter((item) => item.kind === value).length }))}
				label="Catalogue lists"
				onSelect={(value) => update({ kind: value as CatalogueKind })}
			/>
			<ReorderNote searching={searching}>Ordering applies to active {kind}; archived ones keep their place and are skipped. Archive preserves the complete record and removes it from public eligibility. Each translation publishes independently.</ReorderNote>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<SearchField label={`Search ${kind} by name or stable key`} onSearch={(q, options) => update({ q }, options)} placeholder={`Search ${kind}`} value={state.q} />
				<Button asChild className="h-10"><Link href={`/admin/catalogue/${kind}/new`}><Plus aria-hidden="true" />New {singular}</Link></Button>
			</div>
			<LocaleStatesLegend />
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div aria-hidden="true" className={`hidden gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid ${COLUMNS}`}><span>{kind === 'services' ? 'Service' : 'Sector'}</span><span>Languages</span><span>English</span><span className="text-right">Order and edit</span></div>
				{visible.length ? (
					<ul>
						{visible.map((item) => {
							const moves = availability.get(item.id) ?? { up: false, down: false }
							const name = item.name ?? item.stableKey
							return (
								<li className="border-b border-slate-100 last:border-b-0" key={item.id}>
									<div className={`grid gap-3 px-5 py-4 md:items-center md:gap-5 ${COLUMNS}`}>
										<div className="min-w-0"><Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href={`/admin/catalogue/${item.kind}/${item.id}`}>{item.name ?? 'Untitled English translation'}</Link><p className="mt-0.5 truncate text-sm text-slate-500">{item.stableKey}</p></div>
										<LocaleStates states={item.states} />
										<Badge className={item.isActive && item.status === 'published' ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700' : 'w-fit border-amber-200 bg-amber-50 text-amber-800'} variant="outline">{item.isActive ? item.status ?? 'draft' : 'archived'}</Badge>
										<div className="flex items-center gap-1 md:justify-end">
											<span className="mr-1 text-sm tabular-nums text-slate-500" title="Display order">{item.displayOrder}</span>
											<ReorderControls busy={move.pending} canDown={!searching && moves.down} canUp={!searching && moves.up} name={name} onMove={(direction) => move.run({ direction, entryId: item.id, kind: item.kind }, `${item.id}:${direction}`)} pendingDirection={move.pending && move.key?.startsWith(`${item.id}:`) ? move.key.endsWith(':up') ? 'up' : 'down' : null} />
											<Button asChild aria-label={`Edit ${name}`} size="icon" title="Edit" variant="ghost"><Link href={`/admin/catalogue/${item.kind}/${item.id}`}><Pencil aria-hidden="true" /></Link></Button>
										</div>
									</div>
									{move.key?.startsWith(`${item.id}:`) ? <CommandNotice className="mx-5 mb-4" command={move} /> : null}
								</li>
							)
						})}
					</ul>
				) : <div className="px-5 py-14 text-center text-sm text-slate-500">No {kind} match that search.</div>}
			</div>
		</div>
	)
}
