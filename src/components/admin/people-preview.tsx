'use client'

import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { useMemo } from 'react'

import { movePersonAction } from '@/app/(admin)/admin/actions'
import { CommandNotice, useAdminCommand } from '@/components/admin/form/admin-form'
import type { PublicationStatus } from '@/components/admin/form/locale-tabs'
import { SearchField, useListQuery } from '@/components/admin/list-controls'
import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { ReorderControls, ReorderNote } from '@/components/admin/reorder-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PEOPLE_LIST } from '@/lib/admin-list-query.mjs'
import { moveAvailability, sortByDisplayOrder } from '@/lib/display-order.mjs'

type TeamMember = {
	id: string
	name: string
	cardName: string | null
	role: string
	states: Record<string, PublicationStatus | null>
	status: PublicationStatus
	isActive: boolean
	displayOrder: number
	teamGroup: 'managing_team' | 'team'
}

const GROUPS = [
	{ key: 'managing_team', label: 'Managing team' },
	{ key: 'team', label: 'Team' },
] as const

// Profile | languages | English status | actions. The actions column fits
// three icon buttons at every width (audit PPL-08).
const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_14rem_6.5rem_7.5rem]'

export function PeoplePreview({ initialMembers }: { initialMembers: TeamMember[] }) {
	const { state, update } = useListQuery(PEOPLE_LIST, 'history')
	const move = useAdminCommand(movePersonAction)
	const searching = state.q !== ''

	const groups = useMemo(() => GROUPS.map((group) => {
		const members = sortByDisplayOrder(initialMembers.filter((member) => member.teamGroup === group.key).map((member) => ({ ...member, order: member.displayOrder, tieBreak: member.name })))
		const availability = moveAvailability(members, (member) => member.isActive)
		const query = state.q.toLowerCase()
		const visible = query ? members.filter((member) => `${member.name} ${member.cardName ?? ''} ${member.role}`.toLowerCase().includes(query)) : members
		return { ...group, availability, visible }
	}), [initialMembers, state.q])
	const visibleCount = groups.reduce((sum, group) => sum + group.visible.length, 0)

	return (
		<div className="space-y-6">
			<ReorderNote searching={searching}>
				Profiles are ordered within Managing team and Team; archived profiles keep their place and are skipped. Each localized card uses its selected card role, and each language publishes on its own.
			</ReorderNote>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<SearchField label="Search team profiles by name or role" onSearch={(q, options) => update({ q }, options)} placeholder="Search people" value={state.q} />
				<Button asChild className="h-10">
					<Link href="/admin/people/new"><Plus aria-hidden="true" />New profile</Link>
				</Button>
			</div>

			<LocaleStatesLegend />
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div aria-hidden="true" className={`hidden gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid ${COLUMNS}`}>
					<span>Profile</span>
					<span>Languages</span>
					<span>English</span>
					<span className="text-right">Order and edit</span>
				</div>
				{visibleCount ? groups.map((group) => group.visible.length ? (
					<section aria-label={group.label} key={group.key}>
						<h3 className="border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#53617f]">{group.label}</h3>
						<ul>
							{group.visible.map((member) => {
								const moves = group.availability.get(member.id) ?? { up: false, down: false }
								return (
									<li className="border-b border-slate-100 last:border-b-0" key={member.id}>
										<div className={`grid gap-3 px-5 py-4 md:items-center md:gap-5 ${COLUMNS}`}>
											<div className="flex min-w-0 items-center gap-3">
												<div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8ebf3] text-xs font-bold text-[#27335a]">
													{member.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
												</div>
												<div className="min-w-0">
													<Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href={`/admin/people/${member.id}`}>{member.cardName || member.name}</Link>
													<p className="mt-0.5 truncate text-sm text-slate-500" title={member.role}>{member.role}</p>
												</div>
											</div>
											<LocaleStates states={member.states} />
											<Badge
												className={member.status === 'published' && member.isActive ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700' : 'w-fit border-amber-200 bg-amber-50 text-amber-700'}
												variant="outline"
											>
												{member.isActive ? member.status : 'archived'}
											</Badge>
											<div className="flex items-center gap-1 md:justify-end">
												<ReorderControls
													busy={move.pending}
													canDown={!searching && moves.down}
													canUp={!searching && moves.up}
													name={member.name}
													onMove={(direction) => move.run({ direction, personId: member.id }, `${member.id}:${direction}`)}
													pendingDirection={move.pending && move.key?.startsWith(`${member.id}:`) ? move.key.endsWith(':up') ? 'up' : 'down' : null}
												/>
												<Button asChild aria-label={`Edit ${member.name}`} size="icon" title="Edit" variant="ghost"><Link href={`/admin/people/${member.id}`}><Pencil aria-hidden="true" /></Link></Button>
											</div>
										</div>
										{move.key?.startsWith(`${member.id}:`) ? <CommandNotice className="mx-5 mb-4" command={move} /> : null}
									</li>
								)
							})}
						</ul>
					</section>
				) : null) : (
					<div className="px-5 py-14 text-center text-sm text-slate-500">
						No profiles match that search.
					</div>
				)}
			</div>
		</div>
	)
}
