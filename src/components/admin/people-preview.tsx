'use client'

import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type TeamMember = {
	name: string
	role: string
	location: string
	status: 'Published' | 'Draft'
	initials: string
}

const initialMembers: TeamMember[] = [
	{
		name: 'Anna Keller',
		role: 'Managing Partner',
		location: 'Munich',
		status: 'Published',
		initials: 'AK',
	},
	{
		name: 'Luca Bianchi',
		role: 'Senior Consultant',
		location: 'Milan',
		status: 'Published',
		initials: 'LB',
	},
	{
		name: 'Sofia Almeida',
		role: 'Project Director',
		location: 'Lisbon',
		status: 'Draft',
		initials: 'SA',
	},
]

export function PeoplePreview() {
	const [members, setMembers] = useState(initialMembers)
	const [query, setQuery] = useState('')
	const [showForm, setShowForm] = useState(false)
	const [name, setName] = useState('')
	const [role, setRole] = useState('')

	const visibleMembers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase()

		if (!normalizedQuery) {
			return members
		}

		return members.filter((member) =>
			`${member.name} ${member.role} ${member.location}`
				.toLowerCase()
				.includes(normalizedQuery),
		)
	}, [members, query])

	function addPreviewMember(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const trimmedName = name.trim()

		if (!trimmedName) {
			return
		}

		setMembers((currentMembers) => [
			{
				name: trimmedName,
				role: role.trim() || 'Team member',
				location: 'New profile',
				status: 'Draft',
				initials: trimmedName
					.split(/\s+/)
					.map((part) => part[0])
					.join('')
					.slice(0, 2)
					.toUpperCase(),
			},
			...currentMembers,
		])
		setName('')
		setRole('')
		setShowForm(false)
	}

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
				This is an interactive local preview. Added profiles stay only in
				the browser; Supabase persistence is the next implementation step.
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
					onSubmit={addPreviewMember}
				>
					<Input
						autoFocus
						placeholder="Full name"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
					<Input
						placeholder="Role or title"
						value={role}
						onChange={(event) => setRole(event.target.value)}
					/>
					<Button type="submit">Add draft</Button>
				</form>
			)}

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<div className="hidden grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
					<span>Profile</span>
					<span>Location</span>
					<span>Locales</span>
					<span>Status</span>
				</div>
				{visibleMembers.length ? (
					visibleMembers.map((member) => (
						<div
							className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(15rem,1.4fr)_1fr_9rem_7rem] md:items-center md:gap-5"
							key={`${member.name}-${member.role}`}
						>
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8ebf3] text-xs font-bold text-[#27335a]">
									{member.initials}
								</div>
								<div>
									<p className="font-semibold text-slate-900">{member.name}</p>
									<p className="mt-0.5 text-sm text-slate-500">{member.role}</p>
								</div>
							</div>
							<p className="text-sm text-slate-600">{member.location}</p>
							<div className="flex gap-1.5">
								<Badge className="bg-slate-100 text-slate-600" variant="secondary">EN</Badge>
								<Badge className="bg-slate-100 text-slate-600" variant="secondary">DE</Badge>
							</div>
							<Badge
								className={
									member.status === 'Published'
										? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700'
										: 'w-fit border-amber-200 bg-amber-50 text-amber-700'
								}
								variant="outline"
							>
								{member.status}
							</Badge>
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
