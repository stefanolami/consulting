'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { movePersonAction } from '@/app/(admin)/admin/actions'
import { CommandNotice, useAdminCommand } from '@/components/admin/form/admin-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type TeamMember = {
	id: string
	name: string
	cardName: string | null
	role: string
	locales: string[]
	status: 'draft' | 'scheduled' | 'published' | 'archived'
	isActive: boolean
	displayOrder: number
	teamGroup: 'managing_team' | 'team'
}

export function PeoplePreview({ initialMembers }: { initialMembers: TeamMember[] }) {
	const [query, setQuery] = useState('')
	const move = useAdminCommand(movePersonAction)

	const visibleMembers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()

		if (!normalizedQuery) {
			return initialMembers
		}

		return initialMembers.filter((member) =>
			`${member.name} ${member.role} ${member.locales.join(' ')}`
				.toLowerCase()
				.includes(normalizedQuery),
		)
	}, [initialMembers, query])

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
				Profiles are ordered within Managing team or Team. Each localized card uses its selected card role; publishing remains independent per language.
			</div>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<label className="relative block max-w-md flex-1">
					<Search
						aria-hidden="true"
						className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
					/>
					<span className="sr-only">Search team profiles</span>
					<Input
						className="h-10 bg-white pl-9"
						placeholder="Search people"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
				<Button asChild className="h-10">
					<Link href="/admin/people/new"><Plus aria-hidden="true" />New profile</Link>
				</Button>
			</div>

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div className="hidden grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
					<span>Profile</span>
					<span>English title</span>
					<span>Locales</span>
					<span>Status</span>
				</div>
				{visibleMembers.length ? (
					visibleMembers.map((member, index) => (
						<div key={member.id}>
							{(index === 0 || visibleMembers[index - 1].teamGroup !== member.teamGroup) && <div className="border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#53617f]">{member.teamGroup === 'managing_team' ? 'Managing team' : 'Team'}</div>}
						<div
							className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] md:items-center md:gap-5"
						>
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8ebf3] text-xs font-bold text-[#27335a]">
									{member.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
								</div>
								<div>
									<Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href={`/admin/people/${member.id}`}>{member.cardName || member.name}</Link>
									<p className="mt-0.5 text-sm text-slate-500">{member.role}</p>
								</div>
							</div>
							<p className="text-sm text-slate-600">{member.role}</p>
							<div className="flex gap-1.5">
								{member.locales.map((locale) => (
									<Badge className="bg-slate-100 text-slate-600" key={locale} variant="secondary">{locale.toUpperCase()}</Badge>
								))}
							</div>
							<div className="flex items-center justify-between gap-2 md:justify-start">
								<Badge
									className={
										member.status === 'published' && member.isActive
											? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700'
											: 'w-fit border-amber-200 bg-amber-50 text-amber-700'
									}
									variant="outline"
								>
									{member.isActive ? member.status : 'archived'}
								</Badge>
								<div className="flex items-center gap-1">
									{(['up', 'down'] as const).map((direction) => (
										<Button aria-label={`Move ${member.name} ${direction}`} disabled={move.pending} key={direction} onClick={() => move.run({ direction, personId: member.id }, `${member.id}:${direction}`)} size="icon" title={`Move ${direction}`} type="button" variant="ghost">
											{move.pending && move.key === `${member.id}:${direction}` ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : direction === 'up' ? <ArrowUp /> : <ArrowDown />}
										</Button>
									))}
									<Button asChild aria-label={`Edit ${member.name}`} size="icon" title="Edit" variant="ghost"><Link href={`/admin/people/${member.id}`}><Pencil /></Link></Button>
								</div>
							</div>
						</div>
						{move.key?.startsWith(`${member.id}:`) ? <CommandNotice className="mx-5 mb-4" command={move} /> : null}
						</div>
					))
				) : (
					<div className="px-5 py-14 text-center text-sm text-slate-500">
						No profiles match that search.
					</div>
				)}
			</div>
		</div>
	)
}
