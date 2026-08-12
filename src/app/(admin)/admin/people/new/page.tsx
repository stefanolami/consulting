import Link from 'next/link'

import { createPersonAction } from '@/app/(admin)/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const metadata = { title: 'New team profile' }

export default function NewPersonPage() {
	return (
		<div className="mx-auto max-w-5xl">
			<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/people">← Team directory</Link>
			<div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">People and team</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">New team profile</h1><p className="mt-2 text-slate-600">Create the shared profile and an English draft. Add the structured profile sections, more roles, other languages, and a portrait after saving.</p></div>

			<form action={createPersonAction} className="mt-9 space-y-8">
				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
					<h2 className="font-robo text-2xl text-slate-950">Profile details</h2><p className="mt-1 text-sm text-slate-600">Shared identity, contact details and team placement.</p>
					<div className="mt-6 grid gap-5 md:grid-cols-2">
						<Field label="Display name"><Input autoFocus name="displayName" required /></Field>
						<Field label="Stable key"><Input name="stableKey" placeholder="e.g. jane-doe" required /></Field>
						<Field label="Public email"><Input name="email" type="email" /></Field>
						<Field label="Public phone"><Input name="phone" /></Field>
						<Field label="Team group"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue="team" name="teamGroup"><option value="managing_team">Managing team</option><option value="team">Team</option></select></Field>
						<Field label="Order within group"><Input defaultValue="0" min="0" name="displayOrder" type="number" /></Field>
						<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked name="isTeamMember" type="checkbox" /> Show as a team member</label>
						<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input name="isAuthor" type="checkbox" /> Available as an article author</label>
					</div>
				</section>

				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
					<h2 className="font-robo text-2xl text-slate-950">English content</h2><p className="mt-1 text-sm text-slate-600">This creates the first editable public-language version of the profile.</p>
					<div className="mt-6 grid gap-5 md:grid-cols-2">
						<Field label="English URL slug"><Input name="slug" placeholder="e.g. jane-doe" required /></Field>
						<Field label="Card name (optional)"><Input name="cardName" placeholder="Use only when the card name differs" /></Field>
						<Field label="First role"><Input name="primaryRole" required /></Field>
						<Field label="Introduction"><textarea className="min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" name="intro" /></Field>
						<Field label="Publication status"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue="draft" name="status"><option value="draft">Draft</option><option value="published">Published</option></select></Field>
						<Field label="SEO title"><Input name="seoTitle" /></Field>
						<Field label="SEO description"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" name="seoDescription" /></Field>
					</div>
				</section>

				<div className="flex items-center gap-3"><Button type="submit">Create profile</Button><Button asChild variant="outline"><Link href="/admin/people">Cancel</Link></Button></div>
			</form>
		</div>
	)
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className ?? ''}`}><span>{label}</span>{children}</label>
}
