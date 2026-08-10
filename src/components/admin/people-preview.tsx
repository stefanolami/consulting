'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp, Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { createPersonAction, movePersonAction } from '@/app/(admin)/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type TeamMember = {
	id: string
	name: string
	role: string
	locales: string[]
	status: 'draft' | 'scheduled' | 'published' | 'archived'
	isActive: boolean
	displayOrder: number
}

export function PeoplePreview({ initialMembers }: { initialMembers: TeamMember[] }) {
	const [query, setQuery] = useState('')
	const [showForm, setShowForm] = useState(false)

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
				Profiles are stored in Supabase. New profiles start as English drafts
				and need translations before publication.
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
				<Button
					className="h-10 bg-[#27335a] hover:bg-[#1e294c]"
					onClick={() => setShowForm((current) => !current)}
					type="button"
				>
					<Plus aria-hidden="true" />
					New profile
				</Button>
			</div>

			{showForm && (
				<form
					className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
					action={createPersonAction}
				>
					<Input
						autoFocus
						name="displayName"
						placeholder="Full name"
						required
					/>
					<Input
						name="stableKey"
						placeholder="Profile key (e.g. jane-doe)"
						required
					/>
					<Input className="sm:col-span-2" name="jobTitle" placeholder="English job title (optional)" />
					<Button type="submit">Create draft</Button>
				</form>
			)}

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div className="hidden grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
					<span>Profile</span>
					<span>English title</span>
					<span>Locales</span>
					<span>Status</span>
				</div>
				{visibleMembers.length ? (
					visibleMembers.map((member) => (
						<div
							className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] md:items-center md:gap-5"
							key={member.id}
						>
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8ebf3] text-xs font-bold text-[#27335a]">
									{member.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
								</div>
								<div>
									<Link className="font-semibold text-slate-900 underline-offset-4 hover:underline" href={`/admin/people/${member.id}`}>{member.name}</Link>
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
									<form action={movePersonAction}>
										<input name="personId" type="hidden" value={member.id} />
										<input name="direction" type="hidden" value="up" />
										<Button aria-label={`Move ${member.name} up`} size="icon" title="Move up" type="submit" variant="ghost"><ArrowUp /></Button>
									</form>
									<form action={movePersonAction}>
										<input name="personId" type="hidden" value={member.id} />
										<input name="direction" type="hidden" value="down" />
										<Button aria-label={`Move ${member.name} down`} size="icon" title="Move down" type="submit" variant="ghost"><ArrowDown /></Button>
									</form>
									<Button asChild aria-label={`Edit ${member.name}`} size="icon" title="Edit" variant="ghost"><Link href={`/admin/people/${member.id}`}><Pencil /></Link></Button>
								</div>
							</div>
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
