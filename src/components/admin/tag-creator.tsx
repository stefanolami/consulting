'use client'

import { createNewsroomTagAction } from '@/app/(admin)/admin/actions'
import { AdminForm, Field, FormActions, useAdminForm } from '@/components/admin/form/admin-form'
import { Input } from '@/components/ui/input'

export function TagCreator({ tags }: { tags: { id: string; label: string }[] }) {
	const form = useAdminForm({ action: createNewsroomTagAction, label: 'the new tag', resetOnSuccess: true })
	return <section className="mt-9 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-robo text-2xl text-slate-950">Newsroom tags</h2><p className="mt-1 text-sm text-slate-600">Create controlled English tags for article classification. Canonical keys stay stable; localized labels can be added when taxonomy localization is expanded.</p><AdminForm className="mt-5 grid gap-3 sm:grid-cols-4" form={form}><Field label="Stable key" name="stableKey" required><Input name="stableKey" placeholder="e.g. hiring" required /></Field><Field label="English label" name="name" required><Input name="name" required /></Field><Field label="English slug" name="slug" required><Input name="slug" placeholder="e.g. hiring" required /></Field><Field label="Status" name="status"><select className="input-select" defaultValue="published" name="status"><option value="published">Published</option><option value="draft">Draft</option></select></Field><FormActions className="sm:col-span-4" form={form} label="Add tag" /></AdminForm><div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700" key={tag.id}>{tag.label}</span>)}{!tags.length && <p className="text-sm text-slate-500">No tags yet.</p>}</div></section>
}
