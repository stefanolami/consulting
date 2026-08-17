import Link from 'next/link'

import { NewPersonEditor } from '@/components/admin/new-person-editor'

export const metadata = { title: 'New team profile' }

export default function NewPersonPage() {
	return (
		<div className="mx-auto max-w-5xl">
			<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/people">← Team directory</Link>
			<div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">People and team</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">New team profile</h1><p className="mt-2 text-slate-600">Create the full profile exactly as it will appear publicly: group, portrait, localized card, ordered roles, profile sections, lists, endorsements, contact details, and SEO.</p></div>
			<NewPersonEditor />
		</div>
	)
}
