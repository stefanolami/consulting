'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { createPersonAction } from '@/app/(admin)/admin/actions'
import { ProfileDocumentEditor } from '@/components/admin/profile-document-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyProfileDocument } from '@/lib/team-profile-document'

type Role = { title: string; cardLabel: string | null; isCardRole: boolean }

export function NewPersonEditor() {
	const [roles, setRoles] = useState<Role[]>([{ title: '', cardLabel: null, isCardRole: true }])
	function moveRole(index: number, direction: -1 | 1) {
		setRoles((current) => {
			const destination = index + direction
			if (destination < 0 || destination >= current.length) return current
			const next = [...current]
			;[next[index], next[destination]] = [next[destination], next[index]]
			return next
		})
	}

	return <form action={createPersonAction} className="mt-9 space-y-8">
		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<h2 className="font-robo text-2xl text-slate-950">Profile details</h2>
			<p className="mt-1 text-sm text-slate-600">Shared identity, contact details, placement, and portrait.</p>
			<div className="mt-6 grid gap-5 md:grid-cols-2">
				<Field label="Display name"><Input autoFocus name="displayName" required /></Field>
				<Field label="Stable key"><Input name="stableKey" placeholder="e.g. jane-doe" required /></Field>
				<Field label="Public email"><Input name="email" type="email" /></Field>
				<Field label="Public phone"><Input name="phone" /></Field>
				<Field label="Team group"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue="team" name="teamGroup"><option value="managing_team">Managing team</option><option value="team">Team</option></select></Field>
				<Field label="Order within group"><Input defaultValue="0" min="0" name="displayOrder" type="number" /></Field>
				<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked name="isTeamMember" type="checkbox" />Show as a team member</label>
				<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input name="isAuthor" type="checkbox" />Available as an article author</label>
				<Field label="Portrait"><Input accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp" name="portraitFile" type="file" /></Field>
				<Field label="English portrait alt text"><Input name="portraitAltText" placeholder="Portrait of Jane Doe" /></Field>
			</div>
		</section>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<h2 className="font-robo text-2xl text-slate-950">English profile</h2>
			<p className="mt-1 text-sm text-slate-600">Author the complete profile now. Additional language versions use the same structured editor after this first save.</p>
			<div className="mt-6 grid gap-5 md:grid-cols-2">
				<input name="roles" type="hidden" value={JSON.stringify(roles)} />
				<Field label="English URL slug"><Input name="slug" placeholder="e.g. jane-doe" required /></Field>
				<Field label="Card name (optional)"><Input name="cardName" placeholder="Use only when the card name differs" /></Field>
				<div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
					<div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Localized roles</h3><p className="mt-1 text-sm text-slate-600">Add all roles in display order. Select the one shown on the team card and enter a shorter card label only when needed.</p></div><Button onClick={() => setRoles((current) => [...current, { title: '', cardLabel: null, isCardRole: false }])} type="button" variant="outline"><Plus />Add role</Button></div>
					<div className="mt-4 space-y-3">{roles.map((role, index) => <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[auto_1fr_1fr_auto] md:items-end" key={index}><label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600"><input checked={role.isCardRole} name="cardRole" onChange={() => setRoles((current) => current.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === index })))} type="radio" />Card role</label><Field label={`Role ${index + 1}`}><Input value={role.title} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} required /></Field><Field label="Short card label"><Input value={role.cardLabel ?? ''} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, cardLabel: event.target.value || null } : item))} /></Field><div className="flex gap-1"><Button aria-label={`Move role ${index + 1} up`} disabled={index === 0} onClick={() => moveRole(index, -1)} size="icon" type="button" variant="ghost"><ArrowUp /></Button><Button aria-label={`Move role ${index + 1} down`} disabled={index === roles.length - 1} onClick={() => moveRole(index, 1)} size="icon" type="button" variant="ghost"><ArrowDown /></Button><Button aria-label={`Remove role ${index + 1}`} disabled={roles.length === 1} onClick={() => setRoles((current) => { const next = current.filter((_, itemIndex) => itemIndex !== index); return next.some((item) => item.isCardRole) ? next : next.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === 0 })) })} size="icon" type="button" variant="ghost"><Trash2 /></Button></div></div>)}</div>
				</div>
				<div className="md:col-span-2"><ProfileDocumentEditor initialValue={emptyProfileDocument()} /></div>
				<Field label="Publication status"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue="draft" name="status"><option value="draft">Draft</option><option value="published">Published</option></select></Field>
				<div aria-hidden="true" />
				<Field label="SEO title"><Input name="seoTitle" /></Field>
				<Field label="SEO description"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" name="seoDescription" /></Field>
			</div>
		</section>

		<div className="flex items-center gap-3"><Button type="submit">Create profile</Button><Button asChild variant="outline"><Link href="/admin/people">Cancel</Link></Button></div>
	</form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label> }
