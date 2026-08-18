'use client'

import { useActionState } from 'react'
import { createNewsroomTagAction } from '@/app/(admin)/admin/actions'
import type { ArticleActionState } from '@/app/(admin)/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initial: ArticleActionState = {}

export function TagCreator({ tags }: { tags: { id: string; label: string }[] }) {
	const [state, action, pending] = useActionState(createNewsroomTagAction, initial)
	return <section className="mt-9 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-robo text-2xl text-slate-950">Newsroom tags</h2><p className="mt-1 text-sm text-slate-600">Create controlled English tags for article classification. Canonical keys stay stable; localized labels can be added when taxonomy localization is expanded.</p><form action={action} className="mt-5 grid gap-3 sm:grid-cols-4"><Input name="stableKey" placeholder="Stable key" required /><Input name="name" placeholder="English label" required /><Input name="slug" placeholder="English slug" required /><div className="flex gap-2"><select className="h-9 flex-1 rounded-md border border-input bg-white px-3 text-sm" defaultValue="published" name="status"><option value="published">Published</option><option value="draft">Draft</option></select><Button disabled={pending} type="submit">{pending ? 'Saving…' : 'Add tag'}</Button></div></form>{state.error && <p aria-live="polite" className="mt-3 text-sm text-red-700">{state.error}</p>}{state.success && <p aria-live="polite" className="mt-3 text-sm text-emerald-700">{state.success}</p>}<div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700" key={tag.id}>{tag.label}</span>)}{!tags.length && <p className="text-sm text-slate-500">No tags yet.</p>}</div></section>
}
